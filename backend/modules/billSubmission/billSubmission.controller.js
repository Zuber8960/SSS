const db = require('../../config/db');

const toDate = (v) => (v ? String(v).slice(0, 10) : '');

module.exports = {
  async listPendingBills({ loc_code, bp_code, submit_type, annexure_no }) {
    const query = db('sss.sst_invoice_hdr as h')
      .leftJoin('sss.sst_invoice_dtl as d', function () {
        this.on('h.invoice_no', '=', 'd.invoice_no')
          .andOn('h.invoice_date', '=', 'd.invoice_date')
          .andOn('h.loc_code', '=', 'd.invoice_loc');
      })
      .whereNull('h.inv_sub_date')
      .where(function () {
        this.whereNull('h.cancel_flag').orWhere('h.cancel_flag', '<>', 'Y');
      })
      .select(
        'h.invoice_no',
        db.raw("to_char(h.invoice_date::date, 'YYYY-MM-DD') as invoice_date"),
        'h.loc_code',
        'h.bp_code',
        'h.bp_name',
        'h.total_inv_amt',
        'd.inv_sr_no as sr_no',
        'd.docket_no',
        db.raw("to_char(d.docket_date::date, 'YYYY-MM-DD') as docket_date"),
        'd.docket_from_loc',
        'd.docket_to_loc'
      )
      .orderBy('h.invoice_no', 'asc')
      .orderBy('d.inv_sr_no', 'asc');

    if (loc_code) query.andWhere('h.loc_code', loc_code);
    if (bp_code) {
      const partners = await db('sss.ssm_business_partner')
        .where({ bp_grp_code: bp_code })
        .select('bp_grp_code', 'bp_name', 'record_id');
      const names = partners.map((p) => p.bp_name).filter(Boolean);
      query.andWhere(function () {
        this.where('h.bp_code', bp_code);
        if (names.length) this.orWhereIn('h.bp_name', names);
      });
    }

    /*
     * Annexure submissions cover only the bills belonging to that annexure.
     * Without this filter the endpoint ignored `annexure_no` entirely and
     * returned the customer's ENTIRE pending-bill list for that station.
     */
    if (submit_type === 'A' && annexure_no) {
      const annexure = await db('sss.sst_bill_annexure')
        .where({ annexure_no: String(annexure_no) })
        .select('annexure_no', 'from_date', 'loc_code', 'customer_code')
        .first();

      if (!annexure) return [];

      // An annexure is a date-range statement: it covers this customer's bills
      // raised on/after its from_date, within the annexure's own station.
      if (annexure.loc_code) query.andWhere('h.loc_code', annexure.loc_code);
      if (annexure.from_date) {
        query.andWhereRaw('h.invoice_date::date >= ?::date', [toDate(annexure.from_date)]);
      }
      if (annexure.customer_code) {
        const customer = String(annexure.customer_code);
        query.andWhere(function () {
          this.whereRaw('h.bp_code = ?', [customer]);
          this.orWhereRaw('h.bp_grp_code = ?', [customer]).orWhereRaw('h.bp_name = ?', [customer]);
        });
      }
    }

    const rows = await query;
    const dockets = [...new Set(rows.map((r) => r.docket_no).filter(Boolean))];
    const podMap = {};
    if (dockets.length) {
      const pods = await db('sss.sst_dly_note')
        .whereIn('docket_no', dockets)
        .whereNotNull('pod_url')
        .where('pod_url', '<>', '')
        .select('docket_no', 'pod_url', 'record_id')
        .orderBy('record_id', 'desc');
      for (const p of pods) {
        if (!podMap[p.docket_no]) podMap[p.docket_no] = p.pod_url;
      }
    }
    return rows.map((r, index) => ({
      id: `${r.invoice_no}|${toDate(r.invoice_date)}|${r.loc_code}|${r.docket_no || index}`,
      invoice_no: r.invoice_no,
      invoice_date: toDate(r.invoice_date),
      loc_code: r.loc_code,
      bp_code: r.bp_code,
      bp_name: r.bp_name,
      sr_no: r.sr_no || '',
      docket_no: r.docket_no || '',
      docket_date: toDate(r.docket_date),
      docket_from_loc: r.docket_from_loc || '',
      docket_to_loc: r.docket_to_loc || '',
      pod_url: podMap[r.docket_no] || '',
      total_inv_amt: r.total_inv_amt,
    }));
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

  async saveSubmission({ bills, submission_date, submit_to, email_id, contact_no, submit_type, annexure_no, aud_user }) {
    if (!Array.isArray(bills) || bills.length === 0) {
      const err = new Error('Please select at least one bill');
      err.status = 400;
      throw err;
    }
    if (!submission_date) {
      const err = new Error('Please enter Submission Date');
      err.status = 400;
      throw err;
    }
    if (!submit_to) {
      const err = new Error('Please enter Submit To');
      err.status = 400;
      throw err;
    }
    if (!email_id || !String(email_id).includes('@')) {
      const err = new Error('Please enter a valid Email ID');
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
        if (!invoice_no || !invoice_date || !loc_code) continue;
        const key = `${invoice_no}|${invoice_date}|${loc_code}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (new Date(submission_date) < new Date(invoice_date)) {
          throw Object.assign(
            new Error(`Bill Submission Date can not be less then Bill Date (${invoice_date})`),
            { status: 400 }
          );
        }

        const updated = await trx('sss.sst_invoice_hdr')
          .where({ invoice_no, loc_code })
          .andWhereRaw('invoice_date::date = ?::date', [invoice_date])
          .whereNull('inv_sub_date')
          .update({
            inv_sub_date: submission_date,
            modified_on: new Date(),
            modified_by: aud_user || null,
          });

        if (updated) {
          await trx('sss.sst_bill_submission').insert({
            loc_code,
            invoice_no: String(invoice_no),
            invoice_date,
            submit_to,
            email_id,
            contact_no: contact_no || null,
            submission_date,
            submit_type: submit_type || 'B',
            annexure_no: annexure_no || null,
            aud_user: aud_user || null,
          });
          saved += 1;
        }
      }

      if (submit_type === 'A' && annexure_no) {
        await trx('sss.sst_bill_annexure')
          .where({ annexure_no })
          .update({ is_submitted: 'Y' });
      }

      await trx.commit();
      return { saved };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },
};
