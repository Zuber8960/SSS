const db = require('../../config/db');
const { applyInvoiceTenant } = require('../../utils/tenantScope');

const toDate = (v) => (v ? String(v).slice(0, 10) : '');

module.exports = {
  async listPendingBills({ loc_code, from_date, to_date, status, tenant_id }) {
    if (!loc_code) {
      const err = new Error('Please select Billing Branch');
      err.status = 400;
      throw err;
    }
    const fromDate = toDate(from_date);
    const toDateValue = toDate(to_date);
    if (!fromDate || !toDateValue) {
      const err = new Error('Please select From Date and To Date');
      err.status = 400;
      throw err;
    }
    if (fromDate > toDateValue) {
      const err = new Error('From Date cannot be after To Date');
      err.status = 400;
      throw err;
    }

    const submitted = String(status || 'U').toUpperCase() === 'S';
    const query = db('sss.sst_invoice_hdr as h')
      .where('h.loc_code', loc_code)
      .whereRaw("COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')")
      .whereRaw('h.invoice_date::date >= ?::date', [fromDate])
      .whereRaw('h.invoice_date::date <= ?::date', [toDateValue])
      .select(
        'h.invoice_no',
        db.raw("to_char(h.invoice_date::date, 'YYYY-MM-DD') as invoice_date"),
        'h.loc_code',
        'h.bp_code',
        'h.bp_name',
        'h.total_inv_amt',
        db.raw("to_char(h.inv_sub_date::date, 'YYYY-MM-DD') as inv_sub_date")
      )
      .orderByRaw('h.invoice_date::date asc')
      .orderBy('h.invoice_no', 'asc');
    applyInvoiceTenant(query, tenant_id, 'h');

    if (submitted) query.whereNotNull('h.inv_sub_date');
    else query.whereNull('h.inv_sub_date');

    const rows = await query;
    const subMap = {};
    if (submitted && rows.length) {
      const subs = await db('sss.sst_bill_submission')
        .where('loc_code', loc_code)
        .whereIn('invoice_no', rows.map((r) => String(r.invoice_no)))
        .select(
          'record_id',
          'invoice_no',
          'loc_code',
          'submit_to',
          'email_id',
          'contact_no',
          db.raw("to_char(invoice_date::date, 'YYYY-MM-DD') as invoice_date"),
          db.raw("to_char(submission_date::date, 'YYYY-MM-DD') as submission_date")
        )
        .orderBy('record_id', 'desc');
      for (const s of subs) {
        const key = `${s.invoice_no}|${toDate(s.invoice_date)}|${s.loc_code}`;
        if (!subMap[key]) subMap[key] = s;
      }
    }

    return rows.map((r) => {
      const invoiceDate = toDate(r.invoice_date);
      const key = `${r.invoice_no}|${invoiceDate}|${r.loc_code}`;
      const sub = subMap[key] || {};
      const amount = Number(r.total_inv_amt);
      return {
        id: key,
        invoice_no: r.invoice_no,
        invoice_date: invoiceDate,
        loc_code: r.loc_code,
        bp_code: r.bp_code,
        bp_name: r.bp_name || '',
        total_inv_amt: Number.isFinite(amount) ? amount.toFixed(2) : '',
        submitted,
        submission_date: submitted ? (toDate(sub.submission_date) || toDate(r.inv_sub_date)) : '',
        submit_to: submitted ? (sub.submit_to || '') : '',
        email_id: submitted ? (sub.email_id || '') : '',
        contact_no: submitted ? (sub.contact_no || '') : '',
      };
    });
  },

  async listAnnexures({ loc_code, bp_code }) {
    const query = db('sss.sst_bill_annexure')
      .where({ is_submitted: 'N' })
      .select('annexure_no', 'from_date', 'loc_code', 'customer_code')
      .orderBy('annexure_no');
    if (loc_code) query.andWhere({ loc_code });
    if (bp_code) query.andWhere({ customer_code: String(bp_code) });
    const rows = await query;
    return rows.map((r) => ({
      annexure_no: r.annexure_no,
      from_date: toDate(r.from_date),
      label: `${r.annexure_no}${r.from_date ? ` > ${toDate(r.from_date)}` : ''}`,
    }));
  },

  async saveSubmission({ bills, aud_user, tenant_id }) {
    if (!Array.isArray(bills) || bills.length === 0) {
      const err = new Error('Please select at least one bill');
      err.status = 400;
      throw err;
    }

    const trx = await db.transaction();
    try {
      let saved = 0;
      const seen = new Set();
      for (const bill of bills) {
        const invoice_no = bill.invoice_no;
        const invoice_date = toDate(bill.invoice_date);
        const loc_code = bill.loc_code;
        const submission_date = toDate(bill.submission_date);
        const submit_to = String(bill.submit_to || '').trim();
        const email_id = String(bill.email_id || '').trim();
        const contact_no = String(bill.contact_no || '').trim();
        if (!invoice_no || !invoice_date || !loc_code) continue;
        const key = `${invoice_no}|${invoice_date}|${loc_code}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!submission_date) {
          throw Object.assign(
            new Error(`Please select Submission Date for bill ${invoice_no}`),
            { status: 400 }
          );
        }
        if (email_id && !email_id.includes('@')) {
          throw Object.assign(
            new Error(`Please enter a valid Email ID for bill ${invoice_no}`),
            { status: 400 }
          );
        }
        if (submission_date < invoice_date) {
          throw Object.assign(
            new Error(`Submission Date cannot be before Bill Date for bill ${invoice_no}`),
            { status: 400 }
          );
        }

        const invoiceUpdate = trx('sss.sst_invoice_hdr')
          .where({ invoice_no, loc_code })
          .andWhereRaw('invoice_date::date = ?::date', [invoice_date])
          .whereNull('inv_sub_date')
          .whereRaw("COALESCE(UPPER(TRIM(cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')");
        applyInvoiceTenant(invoiceUpdate, tenant_id);
        const updated = await invoiceUpdate.update({
            inv_sub_date: submission_date,
            modified_on: new Date(),
            modified_by: aud_user || null,
          });

        if (!updated) {
          throw Object.assign(
            new Error(`Bill ${invoice_no} is already submitted`),
            { status: 400 }
          );
        }

        await trx('sss.sst_bill_submission').insert({
          loc_code,
          invoice_no: String(invoice_no),
          invoice_date,
          submit_to: submit_to || null,
          email_id: email_id || null,
          contact_no: contact_no || null,
          submission_date,
          submit_type: 'B',
          annexure_no: null,
          aud_user: aud_user || null,
        });
        saved += 1;
      }

      await trx.commit();
      return { saved };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },
};
