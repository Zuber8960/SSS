"""Build the SSS Logistics ERP user-guide presentation."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

NAVY = RGBColor(0x0B, 0x1F, 0x3A)
TEAL = RGBColor(0x0E, 0x74, 0x90)
GOLD = RGBColor(0xB8, 0x94, 0x4A)
INK = RGBColor(0x1E, 0x29, 0x3B)
MUTED = RGBColor(0x47, 0x55, 0x69)
CREAM = RGBColor(0xF6, 0xF4, 0xEF)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xE2, 0xE8, 0xF0)
SOFT = RGBColor(0xF8, 0xFA, 0xFC)
GREEN = RGBColor(0x0F, 0x76, 0x6E)

W, H = 13.333, 7.5
PAGE = {"n": 0}


def rgb(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def box(slide, x, y, w, h, color):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    rgb(s, color)
    s.shadow.inherit = False
    return s


def rbox(slide, x, y, w, h, color):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    rgb(s, color)
    s.shadow.inherit = False
    # tighter corners
    s.adjustments[0] = 0.08
    return s


def text(slide, content, x, y, w, h, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font="Calibri"):
    s = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = s.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = content
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font
    return s


def blank():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    box(slide, 0, 0, W, H, WHITE)
    return slide


def footer(slide, dark=False):
    PAGE["n"] += 1
    color = RGBColor(0xCB, 0xD5, 0xE1) if dark else MUTED
    line = RGBColor(0x1E, 0x3A, 0x5F) if dark else LINE
    box(slide, 0.45, 7.18, 12.4, 0.01, line)
    text(slide, "SSS Logistics ERP  ·  User Guide", 0.45, 7.22, 8, 0.24, 10, color=color)
    text(slide, str(PAGE["n"]), 11.4, 7.22, 1.45, 0.24, 10, color=color, align=PP_ALIGN.RIGHT)


def header(slide, kicker, title):
    box(slide, 0, 0, W, 0.08, GOLD)
    box(slide, 0, 0.08, W, 0.92, NAVY)
    text(slide, kicker.upper(), 0.48, 0.16, 8, 0.22, 11, True, GOLD)
    text(slide, title, 0.48, 0.38, 12, 0.5, 26, True, WHITE)


def purpose(slide, body):
    rbox(slide, 0.42, 1.18, 12.5, 0.78, CREAM)
    text(slide, body, 0.62, 1.28, 12.1, 0.6, 14, color=INK)


def fields(slide, pairs, top=2.12):
    col_w = 6.15
    row_h = 0.62
    gap = 0.12
    for i, (name, desc) in enumerate(pairs):
        col = i % 2
        row = i // 2
        x = 0.42 + col * (col_w + 0.18)
        y = top + row * (row_h + gap)
        rbox(slide, x, y, col_w, row_h, SOFT)
        box(slide, x, y, 0.08, row_h, TEAL)
        text(slide, name, x + 0.22, y + 0.06, col_w - 0.36, 0.24, 13, True, NAVY)
        text(slide, desc, x + 0.22, y + 0.30, col_w - 0.36, 0.26, 12, color=MUTED)


def form_slide(kicker, title, use, pairs):
    s = blank()
    header(s, kicker, title)
    purpose(s, use)
    fields(s, pairs)
    footer(s)
    return s


def section_slide(kicker, title, blurb, items):
    s = blank()
    box(s, 0, 0, 0.18, H, GOLD)
    box(s, 0.18, 0, 5.1, H, NAVY)
    text(s, kicker.upper(), 0.55, 1.7, 4.4, 0.3, 13, True, GOLD)
    text(s, title, 0.55, 2.05, 4.4, 1.4, 32, True, WHITE)
    text(s, blurb, 0.55, 3.7, 4.3, 1.6, 15, color=RGBColor(0xCB, 0xD5, 0xE1))
    y = 1.35
    for name, line in items:
        text(s, name, 5.7, y, 7, 0.32, 18, True, NAVY)
        text(s, line, 5.7, y + 0.32, 7, 0.4, 13, color=MUTED)
        y += 0.85
    footer(s)


prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
prs.core_properties.title = "SSS Logistics ERP User Guide"
prs.core_properties.subject = "Form-by-form guide for operations, billing and fleet"

# Cover
s = blank()
box(s, 0, 0, W, H, NAVY)
box(s, 0, 0, 0.18, H, GOLD)
text(s, "USER GUIDE", 0.7, 1.7, 8, 0.3, 14, True, GOLD)
text(s, "SSS Logistics ERP", 0.7, 2.1, 11, 0.8, 44, True, WHITE)
text(s, "How to use each screen, and what the main fields mean.", 0.7, 3.15, 9, 0.5, 18, color=RGBColor(0xCB, 0xD5, 0xE1))
text(s, "Sign-in   ·   Masters   ·   Booking and movement   ·   Billing   ·   Fleet   ·   Reports", 0.7, 4.3, 11, 0.4, 14, color=GOLD)
text(s, "The company name on screen follows the organisation you sign into.", 0.7, 6.5, 10, 0.3, 13, color=RGBColor(0x94, 0xA3, 0xB8))
footer(s, dark=True)

# Start
s = blank()
header(s, "Getting started", "How to sign in")
purpose(s, "Sign-in is two steps. First the organisation, then your own user. The branch you pick becomes the session branch on every form.")
fields(s, [
    ("Organisation user id", "The company login, for example the id issued for your tenant."),
    ("Organisation password", "Opens that company's sign-in screen and logo."),
    ("Username and password", "Your personal user. An admin can work in every branch of the company."),
    ("Division", "The operating division. Most work sits under division 1."),
    ("Location", "The branch you are working in today. Non-admin users only see branches assigned to them."),
    ("Session branch", "Shown at the top of every form. Change it to switch branch without signing in again."),
    ("Change password", "On the user sign-in screen. You need the current password to set a new one."),
    ("What you see next", "The dashboard. Menus on the left follow your role. An admin sees every menu the company is allowed to use."),
])
footer(s)

# Daily flow
s = blank()
header(s, "Getting started", "A consignment, from booking to money")
purpose(s, "Most freight follows this path. You can open any step from the left menu. The session branch must be the branch that owns the document.")
steps = [
    ("1", "Docket", "Book the consignment: parties, route, weight, pay type and invoice."),
    ("2", "Manifest", "Place it on a local pickup, long haul, or local delivery."),
    ("3", "Unloading", "Record arrival and packages at the next branch."),
    ("4", "Delivery", "Mark delivery and attach the POD."),
    ("5", "Customer bill", "Raise the invoice for TBB, Paid or To Pay freight."),
    ("6", "Money receipt", "Collect against the bill or the docket."),
]
for i, (n, title, line) in enumerate(steps):
    col = i % 3
    row = i // 3
    x = 0.45 + col * 4.2
    y = 2.25 + row * 2.15
    rbox(s, x, y, 3.95, 1.9, SOFT)
    text(s, n, x + 0.22, y + 0.22, 0.6, 0.4, 22, True, GOLD)
    text(s, title, x + 0.85, y + 0.26, 2.8, 0.4, 18, True, NAVY)
    text(s, line, x + 0.22, y + 0.9, 3.5, 0.75, 14, color=MUTED)
footer(s)

section_slide(
    "01",
    "Administration",
    "Who can sign in, which menus they see, and what they can add or change.",
    [
        ("Users", "People, home branch, extra branches, and admin rights."),
        ("Roles and menus", "Name a role, then decide which screens it can open."),
        ("Mapping", "Give a user a role. The left menu follows that role."),
    ],
)

form_slide("Administration", "User Master",
    "Creates the people who sign in after the organisation login. A user belongs to one company and one home branch.",
    [
        ("User ID", "The id typed on the user sign-in screen. It must be unique inside the company."),
        ("User name", "The name shown after login and on documents they create."),
        ("Password", "Set only when the user is created. Later changes use Change Password."),
        ("Email and mobile", "Contact details. Used when the user resets access."),
        ("Division and location", "Home division and the branch they open by default."),
        ("Branch 1 to Branch 5", "Extra branches a non-admin may use. An admin can use every branch of the company."),
        ("Admin user", "Yes shows every menu and every branch. No follows the role and the branch list."),
        ("Status", "Active can sign in. Inactive cannot."),
    ])

form_slide("Administration", "Role Master",
    "A role is a job, such as Operations booking or Accounts. The role itself does not open screens until it is mapped to menus.",
    [
        ("Role code", "Short code stored on the user, for example OPS(BKG)."),
        ("Role name", "The name people see when assigning the role."),
        ("Status", "Active roles can be assigned. Inactive roles stay on file but should not be given to new users."),
    ])

form_slide("Administration", "Menu Master",
    "The list of screens the system can show. You rarely add a menu. You use this list when mapping a role.",
    [
        ("Menu ID", "The number other screens use to point at this menu."),
        ("Parent ID", "Groups the item under Administration, Masters, Transaction, Fleet or Reports."),
        ("Menu name", "The label in the left menu."),
        ("Menu path", "The address of the screen, such as /transaction/docket."),
        ("Sequence", "Order inside its group. Lower numbers sit higher."),
        ("Status", "Inactive menus are hidden from new role mapping."),
    ])

form_slide("Administration", "Role Menu Mapping",
    "Decides what a role may do on each screen. An admin bypasses this and sees the full menu.",
    [
        ("Role", "The job you are setting up."),
        ("Menu", "One or more screens to attach to that role."),
        ("View", "The user can open the screen."),
        ("Add", "The user can create a new record."),
        ("Edit", "The user can change an existing record."),
        ("Delete", "The user can remove a record, where the screen allows it."),
    ])

form_slide("Administration", "User Role Mapping",
    "Connects a person to a role. After the next sign-in, the left menu shows only the screens that role can view.",
    [
        ("User ID", "The person receiving the role."),
        ("Role code", "The job, such as OPS(BKG) for booking."),
        ("One role, many screens", "Add the role once. The screens come from Role Menu Mapping."),
        ("Admin users", "Still sign in with full access. The role does not reduce an admin menu."),
    ])

section_slide(
    "02",
    "Masters",
    "Standing data. Set these up before booking, hiring a vehicle, or billing.",
    [
        ("Company and branches", "Who you are, and the offices that book and deliver."),
        ("Parties and vehicles", "Customers, suppliers, and the lorries that move freight."),
        ("Zones and towns", "Where a branch delivers, and which customer a zone belongs to."),
    ],
)

form_slide("Masters", "Company Master",
    "The legal entity: name, address and tax numbers printed on bills and dockets. On a Logipod login this menu is hidden.",
    [
        ("Company name", "Printed on the docket, bill, manifest and receipt."),
        ("Address, state, city, PIN", "Registered office. State and city come from the state master."),
        ("Phone, email, website", "Contact lines on printed stationery."),
        ("PAN, GSTIN, TAN", "Tax identities. GSTIN is used when a branch has no GSTIN of its own."),
        ("Opened on / Closed on", "When the company started, and when it stopped if it is closed."),
        ("Status", "Active companies stay available. Inactive companies stay on file."),
    ])

form_slide("Masters", "Division Master",
    "A division sits under the company. Sign-in asks for a division, and locations and parties belong to one.",
    [
        ("Company code", "The company this division belongs to."),
        ("Division code", "The number chosen on the sign-in screen."),
        ("Division name", "Full name, for example Logipod Supply Chain Solutions."),
        ("Short name", "A short label used where the full name does not fit."),
        ("Opened on / Closed on", "Life of the division."),
        ("Status", "Active or inactive."),
    ])

form_slide("Masters", "Location Master",
    "A branch, head office, warehouse or yard. Docket numbers, manifests and the session branch all use this code.",
    [
        ("Location code", "Short code such as GGRN or LPHO. It is typed on dockets and manifests."),
        ("Location name", "The name shown beside the code."),
        ("Location type", "HO head office, or BRANCH, RO, ZO, AO, warehouse or yard."),
        ("Address, state, town, PIN", "Where the branch sits. Town is also the city used on documents."),
        ("Division", "The division this branch belongs to."),
        ("GSTIN", "If filled, bills raised at this branch use this GSTIN."),
        ("Status", "Active branches appear on sign-in and on forms."),
        ("Parent location", "Optional higher office, when the branch reports to one."),
    ])

form_slide("Masters", "Business Partner",
    "Customers and suppliers. A party is stored once for each branch that uses it, so GGRN and LDHA can both book the same name.",
    [
        ("BP name and code", "The trading name, and a short code such as LPCUST. Bills and receipts use the code."),
        ("BP type", "Customer, Supplier, or Both."),
        ("Supplier type", "For a supplier: Lorry Owner, Lorry Broker, fuel, spares and similar. Hire voucher brokers are Lorry Broker."),
        ("Location", "The branch this copy of the party belongs to."),
        ("PAN, GSTIN, address", "Printed on the docket when the party is chosen as consignor or consignee."),
        ("Factory charge", "Y adds the factory charge and fuel surcharge on that customer's docket."),
        ("CMF flag", "Used when a TBB bill must be raised on the consignee instead of the consignor."),
        ("Credit days and bank", "Credit period, and the supplier bank account for payments."),
    ])

form_slide("Masters", "Lorry Master",
    "One card per vehicle. Manifest and hire voucher pick the vehicle from here, and the owner and documents come with it.",
    [
        ("Vehicle number", "Registration, without spaces. This is what you type on a manifest."),
        ("Vehicle type", "Truck, trailer, LCV and similar. FTL dockets must name a vehicle type."),
        ("Owner, make, model", "Who owns it, and the vehicle identity."),
        ("Engine and chassis", "From the registration certificate."),
        ("Tax, fitness, PUC dates", "Expiry dates so an expired vehicle can be spotted before it is hired."),
        ("Fuel, body, emission", "Fuel type, body type and emission stage."),
        ("Black listed / Active", "A blacklisted or inactive vehicle should not be placed on a new manifest."),
        ("Insurance", "Insurer, policy and the date cover ends."),
    ])

form_slide("Masters", "Lorry Owner Vehicle",
    "Links a vehicle to the business partner who owns it. Hire voucher uses this link to fill the owner.",
    [
        ("Vehicle number", "Must already exist on Lorry Master."),
        ("Owner", "The supplier business partner who owns the vehicle."),
        ("Ownership", "Own, market or vendor. This is the hire type."),
        ("Attached on", "The date this owner link started."),
        ("Why it matters", "When you type the vehicle on a hire voucher, the owner code and name come from this link."),
    ])

form_slide("Masters", "Make Zone",
    "A delivery zone for one branch and, when needed, one customer. Rates and service areas hang off the zone.",
    [
        ("Location", "The branch that owns the zone."),
        ("Customer", "Optional. Leave it open for a general zone, or pick a customer for a dedicated area."),
        ("Zone name", "The label operations will recognise. This is what you type."),
        ("Zone code", "Given by the system when you save. You cannot type it."),
        ("Next step", "Add the towns of this zone on Zone Town Mapping."),
    ])

form_slide("Masters", "Zone Town Mapping",
    "Puts towns into a zone. A docket town must belong to the destination branch before it can be booked there.",
    [
        ("Zone", "The zone created on Make Zone."),
        ("Town", "A town already attached to a branch on Add Town."),
        ("Customer", "Keeps a customer's towns separate when the zone is customer-specific."),
        ("Use", "Map every town the branch delivers to. Booking then offers those towns in To Town."),
    ])

form_slide("Masters", "Add Town",
    "Towns served by a branch, with map position and the out-of-delivery-area flag.",
    [
        ("Location", "The branch that serves the town."),
        ("Town name", "Shown on the docket as From Town or To Town. Spelling must stay consistent."),
        ("Latitude and longitude", "Required. Used for distance and for the town to be saved."),
        ("ODA flag", "Y marks an out-of-delivery-area town. A factory-charge customer then picks up the ODA charge."),
    ])

section_slide(
    "03",
    "Transactions",
    "The daily documents: the docket, the vehicle movement, delivery, the bill and the receipt.",
    [
        ("Book", "Docket, e-way bill and pre-allocated numbers."),
        ("Move", "Manifest, trip, unloading and delivery."),
        ("Get paid", "Customer bill, submission, receipt and adjustment."),
    ],
)

form_slide("Transactions", "Docket",
    "The consignment note. One docket is one booking from a branch to a delivery branch. Everything later — manifest, bill, receipt — hangs on this number.",
    [
        ("Docket no and date", "Number of the consignment and the booking date. The date drives dashboard periods and billing."),
        ("From / To location", "Booking branch and delivery branch. From location follows the session branch."),
        ("From / To town", "Towns served by those branches. To town must be mapped to the delivery branch."),
        ("Consignor and consignee", "Type three letters to search. Choosing a party fills address, GSTIN and mobile."),
        ("Load type", "FTL, LTL or Sundry. FTL needs a vehicle type. Dashboard FTL / PTL follows this."),
        ("Pay type", "TBB bills the account customer. PAID is collected at origin. TO PAY is collected at destination."),
        ("Weight and packages", "Actual weight, charge weight and total packages. Charge weight is what the rate uses."),
        ("Rate and UOM", "Rate with Fixed, Per KG, Per Tonne, Per Unit or Per Trip."),
    ])

form_slide("Transactions", "Docket — invoice, risk and charges",
    "The lower part of the docket carries the customer's invoice, insurance and the freight charges. Saving replaces the invoice lines for that docket.",
    [
        ("Invoice no, date, value", "The customer's commercial invoice. More than one invoice can sit on the docket."),
        ("E-way bill", "E-way number and validity. Required when the invoice value needs an e-way bill."),
        ("Risk", "Insured by the transporter, insured by the customer, or not insured."),
        ("Policy and sum insured", "Insurer, policy, certificate, sum insured and valid up to, when the transporter covers the goods."),
        ("Freight and other charges", "The charge grid. Factory charge and fuel surcharge appear when the consignor is flagged for them."),
        ("FOV", "Freight on value, calculated from the invoice value when the charge applies."),
        ("Print", "Print the docket and the package sticker after the record is saved."),
        ("Edit", "Open by docket number. Saving writes the current invoice list once, so old invoice copies are not left behind."),
    ])

form_slide("Transactions", "Update EWB Docket",
    "Adds or corrects the e-way bill on a docket that is already saved, without re-entering the whole booking.",
    [
        ("Docket number", "The booking to update."),
        ("E-way bill number", "The 12-digit e-way bill."),
        ("Valid up to", "The expiry used by the e-way bill card on the dashboard."),
        ("Invoice link", "The e-way bill stays with the invoice line it belongs to."),
    ])

form_slide("Transactions", "EWB Status",
    "A working list of e-way bills that are still open, near expiry, or already expired, for the dockets of this company.",
    [
        ("Docket and invoice", "Which booking and which invoice the e-way bill belongs to."),
        ("E-way number", "The bill to extend or close on the government portal."),
        ("Expiry", "The date the dashboard uses for Delivered and Undelivered expiry counts."),
        ("Branch", "Only dockets of the signed-in company are listed."),
    ])

form_slide("Transactions", "Docket Pre Allocation",
    "Reserves a block of docket numbers for a customer at a branch, so booking can pick the next unused number.",
    [
        ("Customer", "The party the series is reserved for."),
        ("Branch", "The booking branch. Numbers are not shared with another company."),
        ("Number of dockets", "How many numbers to reserve in this batch."),
        ("Unused / Used", "Filter the list. A used number already sits on a docket and cannot be issued again."),
    ])

form_slide("Transactions", "Trip Sheet",
    "A trip header for a hired or own vehicle: who ran it, between which branches, and how far.",
    [
        ("Trip number and date", "Identity of the trip."),
        ("Vendor", "The supplier who provided the vehicle."),
        ("Vehicle number", "The lorry on Lorry Master."),
        ("From and to", "Start branch and end branch."),
        ("Kilometres and trips", "Distance and how many trips this sheet covers."),
        ("Remarks", "Notes for the trip. Detail rows can be added under the header."),
    ])

form_slide("Transactions", "Manifest Entry",
    "Puts dockets on a vehicle. A manifest is either a local pickup, a long haul, or a local delivery. The type decides which movement the dashboard counts.",
    [
        ("Manifest type", "Local Pickup leaves the booking branch. Long Haul is the line-haul. Local Delivery is the final delivery, even if it starts at the booking branch."),
        ("Manifest no, date, branch", "The document key. The date is the placement date on the order board."),
        ("From and to", "The branch the vehicle leaves and the branch it is going to."),
        ("Vehicle and driver", "Vehicle from Lorry Master, with driver name and mobile."),
        ("Show Docket", "On a new manifest, lists dockets that can still be picked up or delivered."),
        ("Add Docket", "In edit, keeps the dockets already on the manifest and offers more pending ones."),
        ("Tick and save", "Only ticked dockets stay on the manifest. At least one docket must remain."),
        ("Print", "Prints the manifest with the company name and the docket lines."),
    ])

form_slide("Transactions", "Manifest — what each type does",
    "Use the type that matches where the goods are, not the branch name alone.",
    [
        ("Local pickup", "Goods leave the booking branch for the first time. The docket then counts as placed."),
        ("Long haul", "Movement between branches that are not the final delivery. A hub leg uses this type."),
        ("Local delivery", "The delivery run. It counts as destination despatch even when the manifest is raised at the booking branch."),
        ("Packages", "Packages on the line cannot exceed what is still pending at that branch."),
        ("Removing a docket", "Untick it and save. It can be added to another manifest of the same kind."),
        ("Session branch", "You can open and change a manifest of the branch you are signed into."),
    ])

form_slide("Transactions", "Hire Voucher",
    "The lorry hire bill for one vehicle trip. It records the hire, the advance, and the manifests that trip covered.",
    [
        ("Voucher number and date", "Number is given on save. Date is the hire period used on the dashboard."),
        ("Vehicle number", "Type the registration and leave the field. Owner and open manifests are looked up."),
        ("Ownership", "Own, Market or Vendor."),
        ("Owner and broker", "Owner comes from Lorry Owner Vehicle. Broker is a supplier of type Lorry Broker."),
        ("Pay to", "Advance is paid to the owner or the broker."),
        ("Hire, advance, balance", "Balance is hire minus the advance paid on this voucher."),
        ("Advance paid on", "The date the advance was paid."),
        ("Payment mode", "Cash or Bank. Bank asks for the cheque or UTR number."),
    ])

form_slide("Transactions", "Hire Voucher — lines and delete",
    "The lower grid is the manifests this hire covers. Saving the voucher attaches those manifests so they are not hired twice.",
    [
        ("Manifest lines", "Docket count, packages and weight of each manifest on this trip."),
        ("Loading remarks", "Free text under the advance row."),
        ("TDS", "Deduction stored on the voucher and shown under Hire on the vendor board."),
        ("Delete", "On the list at the bottom. Removes the voucher and its lines for this branch only."),
        ("Another company", "A Logipod user cannot see or change a Cargo Yaan hire voucher, and the reverse."),
    ])

form_slide("Transactions", "Manifest Unloading",
    "Records that a manifest has arrived. Arrival date is what the hub and destination boards use as the ready date.",
    [
        ("Manifest number and date", "The manifest that has reached this branch."),
        ("Origin and destination", "Filled from the manifest. Destination should be the branch you are signed into."),
        ("Vehicle and driver", "Confirm you are unloading the vehicle that left."),
        ("Arrival date and time", "When the goods were received. Later despatch slabs count from this date."),
        ("Seal and dock", "Seal number and the unloading dock, when the branch uses them."),
        ("Dockets and packages", "Total dockets, packages and weight unloaded. Short receipt is visible against the manifest."),
        ("Arrival remarks", "Condition of the goods or a shortage note."),
    ])

form_slide("Transactions", "Delivery Update",
    "Closes the docket at destination: delivered or not, the date, and the proof of delivery.",
    [
        ("Docket number", "The consignment being delivered. It must belong to this company."),
        ("Delivery date", "Actual delivery. The dashboard compares it with arrival at destination."),
        ("Status", "Delivered, or still undelivered with a reason."),
        ("POD", "Upload the signed proof. A delivered docket without a POD stays in the without-POD count."),
        ("Receiver", "Name of the person who took the goods, when the form asks for it."),
    ])

form_slide("Transactions", "Customer Bill",
    "Raises the tax invoice for one customer. The docket list is the unbilled freight for that customer in the date range.",
    [
        ("Bill number and date", "Invoice identity. A number already used by another company is refused."),
        ("Billing branch", "The branch that issues the bill. Its GSTIN is used when the branch has one."),
        ("Customer", "Search by code or name. Paid uses the consignor, To Pay the consignee, TBB the billing party."),
        ("From and to dates", "Docket date range. Only the docket date is used, not the delivery date."),
        ("Docket grid", "Tick the dockets to put on this bill. The grid is not paged, so the full set is on screen."),
        ("SAC code", "Service accounting code for freight, normally 996511."),
        ("Invoice remarks", "Text printed on the bill."),
        ("Edit", "Open a saved bill by its number. The grid loads only the dockets already on that bill."),
    ])

form_slide("Transactions", "Bill Submission",
    "Marks customer bills as submitted to the customer, and prints the covering list.",
    [
        ("Billing branch", "Bills of this branch."),
        ("From and to date", "Invoice dates to include."),
        ("Unsubmitted", "Bills not yet sent. This is the list you submit."),
        ("Submitted", "Bills already sent. Use it to reprint or review."),
        ("Submit", "Stamps the selected bills as submitted. You cannot submit another company's bill."),
    ])

form_slide("Transactions", "Money Receipt",
    "Records money received. Paid and To Pay freight is collected here. The receipt is tied to the customer and the branch.",
    [
        ("MR number and date", "Receipt identity. On edit, type the number and choose Edit again to load it."),
        ("Branch", "The session branch. You can receipt only for the branch you are in."),
        ("MR reason", "Why the money was taken, such as freight collection."),
        ("Customer", "Search by code or name. Outstanding dockets for that party are offered."),
        ("Pay mode", "Cash or bank. Bank opens cheque / UTR and the bank name."),
        ("Received amount", "What was actually received. The net of the selected lines is shown beside it."),
        ("Docket lines", "The dockets or bills this receipt clears."),
    ])

form_slide("Transactions", "Bill Adjustment",
    "Applies a receipt, or part of a receipt, to open bills so the outstanding on the dashboard comes down.",
    [
        ("Customer", "The party whose bills and receipts you are matching."),
        ("Open bills", "Invoices that still have a balance."),
        ("Open receipts", "Money received that is not yet fully adjusted."),
        ("Amount", "How much of the receipt to apply to each bill."),
        ("Branch", "Adjustments stay inside the company and the branch of the documents."),
    ])

section_slide(
    "04",
    "Fleet",
    "Own-vehicle maintenance: the parts, the suppliers, the job card and its approval.",
    [
        ("Items", "Groups, spare parts and the suppliers who sell them."),
        ("Job card", "Work to be done on a lorry, with an estimate."),
        ("Approval", "A supervisor accepts the job before the work is treated as approved."),
    ],
)

form_slide("Fleet", "Item Group Master",
    "Families of parts, such as tyres or filters. Every item belongs to one group.",
    [
        ("Item group code", "Short code. It cannot be changed after the group is saved."),
        ("Item group description", "The name the workshop sees."),
        ("Item group category", "A further grouping, stored in capitals."),
    ])

form_slide("Fleet", "Item Master",
    "One spare, consumable or service the workshop can put on a job card.",
    [
        ("Item code and description", "Identity of the part or service."),
        ("Item group", "The group and group category it belongs to."),
        ("Item category", "A finer class inside the group."),
        ("Account code", "The account the cost is posted to."),
        ("Rate and labour", "Material rate and the labour charge."),
        ("GST rate", "Tax percentage on the item."),
        ("Goods or services", "HSN for goods, SAC for services."),
        ("Status and expiry", "Whether the item can still be used, and the date it expires."),
    ])

form_slide("Fleet", "Item Supplier Master",
    "Which supplier sells an item, in what pack, and until when. Pick the group and the item, then fill one row per supplier.",
    [
        ("Item group and item", "Narrows the list to one part."),
        ("Supplier code", "The supplier business partner."),
        ("UOM and weight", "How the item is bought, and its weight."),
        ("Pack type and pack qty", "The pack the supplier sells, and how many units are in it."),
        ("Item amount", "The buying amount for that pack."),
        ("Valid to", "The last date this supplier rate can be used."),
        ("Status", "Valid or Un-valid. An un-valid row stays on file but should not be picked."),
    ])

form_slide("Fleet", "Job Card Creation",
    "Opens workshop work on one lorry: why it is in, who is responsible, and the estimated cost of the lines.",
    [
        ("Lorry number", "The own or attached vehicle. Make and branch fill from the lorry."),
        ("Job number and date", "Number is issued by the system. Date is the day the job opened."),
        ("Kilometres", "Odometer at the time of the job."),
        ("Driver and supervisor", "Who brought the vehicle and who owns the job."),
        ("Job type", "Preventive maintenance, normal repair, accidental, or AMC."),
        ("Lines", "Items or work, with quantity and estimated amount."),
        ("Total estimate", "Sum of the lines. This is what approval looks at."),
    ])

form_slide("Fleet", "Job Approval",
    "A second person accepts or rejects job cards for a fleet branch. The amounts on screen are the estimate, the proposal and what has already been approved.",
    [
        ("Fleet branch", "The workshop whose jobs you are reviewing."),
        ("Region and controlling", "Narrow the jobs to an area and a controlling office."),
        ("Job", "The job card raised on Job Card Creation."),
        ("Estimate and proposed", "What the job card asked for, and the proposed amount."),
        ("RM approved", "The amount already approved at the previous level."),
        ("Total approved", "The amount you are confirming."),
        ("Approve or reject", "Apply the decision to the selected lines. A rejected job should not be carried out."),
    ])

section_slide(
    "05",
    "Reports",
    "Lists you can filter, export and, where allowed, act on. Figures are only for the company you signed into.",
    [
        ("Find a document", "Docket enquiry, all dockets, manifests and hire vouchers."),
        ("Money", "Invoices, and the customer shipment MIS."),
        ("Export", "The grids export to Excel or CSV from the toolbar."),
    ],
)

form_slide("Reports", "Docket Enquiry",
    "Looks up one docket and shows where it is: booked, on a manifest, arrived, delivered and billed.",
    [
        ("Docket number", "The consignment to trace."),
        ("Parties and route", "Consignor, consignee, from and to."),
        ("Movement", "Manifests that have carried it, with dates."),
        ("Delivery and bill", "Whether it is delivered and whether an invoice exists."),
    ])

form_slide("Reports", "All Docket Report",
    "Every docket of the company, with filters. The columns up to To Town stay fixed while you scroll sideways.",
    [
        ("Search", "Docket number or party."),
        ("From town and to town", "Narrow the route."),
        ("Date range", "Docket date."),
        ("Delete", "Removes a docket and its movement lines. The button is off when a bill exists."),
        ("Paid and To Pay", "Delete is also off when a money receipt exists for that docket."),
        ("Export", "Sends the filtered grid to Excel."),
    ])

form_slide("Reports", "Manifest Report",
    "Manifests of the company, so you can see which vehicle moved which dockets.",
    [
        ("Manifest number and date", "The document key."),
        ("Type", "Local pickup, long haul or local delivery."),
        ("From and to branch", "The leg the vehicle ran."),
        ("Vehicle", "Registration on the manifest."),
        ("Dockets", "The consignments that were on it."),
    ])

form_slide("Reports", "Hire Voucher Report",
    "Hire vouchers of the company for a date range: vendor, vehicle, hire, advance and balance.",
    [
        ("Date range", "Voucher date."),
        ("Branch", "The branch that raised the voucher."),
        ("Vehicle and vendor", "Who was hired and for which lorry."),
        ("Hire, paid, balance", "The amounts. Balance is hire minus advance."),
        ("Export", "The filtered rows can be taken to Excel."),
    ])

form_slide("Reports", "Invoice Report",
    "Customer bills raised by the company. Open a row to reprint or to see the dockets on the bill.",
    [
        ("Bill number and date", "The tax invoice."),
        ("Customer", "The billing party."),
        ("Branch", "The branch that issued the bill."),
        ("Amount", "Invoice total, including the freight on the docket lines."),
        ("Reprint", "Uses the same layout as Customer Bill print."),
    ])

form_slide("Reports", "Customer MIS",
    "A shipment register for a customer: LR, bill, route, weight, charges and whether it was delivered on time. Logipod sees this menu as CUST MIS. Other companies see it as Toyota MIS.",
    [
        ("Date range", "LR date, which is the docket date."),
        ("Party", "The customer the rows are for."),
        ("From and to", "Lane of the shipment."),
        ("Weight, rate, charge", "Charge weight, the rate and the freight."),
        ("Status and POD date", "In transit, delivered or cancelled, with the actual delivery date."),
        ("E-way bill", "Number and expiry on the same row."),
        ("Export", "CSV of the filtered register."),
    ])

# Dashboard
s = blank()
header(s, "Every day", "Dashboard")
purpose(s, "The home screen after sign-in. Every figure is for the company you signed into, and for the lane you select: Both, FTL or PTL. Click a figure to open the dockets behind it.")
cards = [
    ("Order Management", "Bookings by period. Placed means a manifest exists. Pending means it does not."),
    ("Despatch Management", "From origin, from hubs and from destination, split into despatched and still waiting."),
    ("Arrived and in transit", "Manifests that have a vehicle, for the financial year."),
    ("Delivered dockets", "Delivered against arrival at the destination branch."),
    ("Revenue", "To Pay, Paid and TBB freight for the year."),
    ("Collection", "Bills raised and money received."),
    ("Month wise", "Dockets and amount by month of the financial year."),
    ("Outstanding", "Unpaid bills by age from the invoice date."),
    ("Lorry hire", "Hire vouchers: count, amount, paid and balance."),
    ("E-way bill expiry", "Open e-way bills, split by delivered and undelivered."),
    ("Customer analysis", "Freight, billing and collection by customer for last month, this month and the year."),
    ("Vendor analysis", "Trips and hire by vendor for the same three periods."),
]
for i, (name, desc) in enumerate(cards):
    col = i % 3
    row = i // 3
    x = 0.4 + col * 4.25
    y = 2.15 + row * 1.2
    rbox(s, x, y, 4.05, 1.05, SOFT)
    text(s, name, x + 0.16, y + 0.1, 3.75, 0.28, 13, True, NAVY)
    text(s, desc, x + 0.16, y + 0.42, 3.75, 0.52, 12, color=MUTED)
footer(s)

# Close
s = blank()
box(s, 0, 0, W, H, NAVY)
box(s, 0, 0, 0.18, H, GOLD)
text(s, "BEFORE YOU SAVE", 0.75, 1.6, 10, 0.3, 14, True, GOLD)
text(s, "Three checks that prevent most errors", 0.75, 2.05, 11, 0.6, 32, True, WHITE)
notes = [
    ("Right branch", "The session branch must be the branch that owns the docket, manifest, bill or receipt."),
    ("Right company", "You only see your own company's documents. A number from another company will not open."),
    ("Right party", "Pick the customer or supplier from the search so the code, GSTIN and branch copy are stored."),
]
y = 3.15
for title, line in notes:
    text(s, title, 0.75, y, 11, 0.32, 18, True, GOLD)
    text(s, line, 0.75, y + 0.34, 11, 0.36, 15, color=RGBColor(0xE2, 0xE8, 0xF0))
    y += 0.95
footer(s, dark=True)

out = r"C:\project\SSS\SSS-main\docs\SSS-User-Guide.pptx"
prs.save(out)
print(f"slides={len(prs.slides)} file={out}")
