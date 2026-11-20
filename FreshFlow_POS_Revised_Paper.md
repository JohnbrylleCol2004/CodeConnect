# FreshFlow POS: CodeConnect Revised Paper

**COLLEGE OF COMPUTER STUDIES**  
**SYSTEMS INTEGRATION AND ARCHITECTURE 2**  

**Prepared by:**  
John Brylle A. Col  
Katrina A. Zantua  

**Section:** TW41  
**Professor:** Ms. Jocelyn Tejada  

---

## Table of Contents
1. Introduction
2. Business Context and Problem
3. Proposed System
4. Objectives and Scope
5. System Architecture and Workflow
6. Integration Points and Interface Rules
7. Expiry-Risk and Waste-Reduction Process
8. Security, Validation, Logging, and Versioning
9. Testing and Verification
10. Risks, Constraints, and Mitigation
11. Implementation Methodology
12. Expected Benefits and Limitations
13. Conclusion
14. References

---

## Executive Summary

FreshFlow POS is a proposed web-based expiry-aware inventory and waste reduction system for retail convenience stores. Its main purpose is to help managers identify products that may expire before being sold.

The system connects checkout transactions, inventory records, product batches, expiry dates, sales movement, and manager alerts. It can classify products according to expiry risk, recommend actions such as prioritizing display or reviewing discounts, and record whether products were sold, discounted, removed, or wasted.

Checkout, receipts, payment status, and inventory updates serve as supporting functions. The main focus of FreshFlow POS is reducing product waste through expiry monitoring, FEFO stock rotation, manager approval, and waste-history reporting. The initial prototype will not replace external payment, accounting, payroll, procurement, or existing POS systems.

---

## 1. Introduction

Retail convenience stores sell different types of products, including drinks, snacks, dairy products, ready-to-eat meals, and other goods with different expiry dates. Some products sell quickly, while others may remain on shelves for a longer period.

One major problem in this type of business is product waste. Products may expire because employees do not receive timely alerts, inventory records are inaccurate, or products with earlier expiry dates are not sold first.

A normal POS system records sales and deducts inventory. However, FreshFlow POS is designed to go further by connecting sales data with expiry monitoring and waste-reduction decisions.

When a product is sold, the system will update its quantity, identify the affected batch, check the expiry date, analyze sales movement, and determine whether manager attention is needed.

### 1.1 Purpose of the Proposal
The purpose of this proposal is to define a web-based system that helps a retail convenience store reduce avoidable product waste and improve inventory decisions.

The system will support employees by providing:
- Accurate inventory updates
- Product batch tracking
- Expiry-date monitoring
- Expiry-risk classification
- Sales-movement information
- Waste-reduction alerts
- Manager-approved action recording
- Waste-history reports

### 1.2 Project Direction
FreshFlow POS will:
- Focus on expiry-aware inventory management.
- Use checkout as a supporting function.
- Track products by batch and expiry date.
- Identify products at risk of expiring before being sold.
- Provide alerts and recommended actions to managers.
- Record the result of expiry-related actions.
- Maintain one integrated web-based system.
- Use one database as the central source of product, sales, inventory, and expiry information.

---

## 2. Business Context and Problem

Retail convenience stores must serve customers quickly while keeping product records accurate. Employees need to know the quantity available, which products are approaching expiry, which items are selling quickly, and which products may require action.

When stores depend only on manual checking, several problems may occur:
- Employees may overlook products near expiry.
- Products with later expiry dates may be sold before older batches.
- Inventory quantities may not match actual shelf quantities.
- Managers may not know which products are likely to become waste.
- Discounts or product reviews may happen too late.
- Wasted products may not be recorded correctly.

### 2.1 Operational Problems

| Problem | Operational Effect | Possible Result |
| :--- | :--- | :--- |
| **Missed expiry dates** | Products remain on shelves without timely review. | Product waste and financial loss |
| **No batch-level tracking** | Employees cannot identify which products expire first. | Older products may remain unsold |
| **Incorrect stock deduction** | System quantity does not match actual quantity. | Incorrect inventory decisions |
| **No sales-movement analysis** | The store cannot determine whether products will sell before expiry. | Products may expire before being sold |
| **Delayed manager action** | Managers receive information only after a problem occurs. | Missed discount or display opportunities |
| **Unrecorded waste** | Removed or expired products are not documented. | Poor future ordering decisions |
| **Manual monitoring** | Employees depend on separate lists or visual checking. | Inconsistent and time-consuming work |

### 2.2 Problem Statement
A retail convenience store needs a system that does more than record sales. It needs a system that connects checkout information with product batches, expiry dates, sales movement, and waste-reduction actions.

Without this connection, the store may experience:
- Avoidable product waste
- Incorrect inventory information
- Missed near-expiry products
- Poor stock rotation
- Delayed management decisions
- Inaccurate ordering decisions
- Reduced profitability

---

## 3. Proposed System

FreshFlow POS is a web-based expiry-aware inventory and waste reduction system. It uses checkout transactions and inventory records to help managers identify products that may expire before being sold.

The system will provide ordinary POS functions, but these functions will support the main goal of reducing expiry-related waste.

### 3.1 Main System Functions
- **Checkout and Sales:** The system records products purchased, quantities, prices, payment status, and receipt information. The sales record provides the data needed for inventory and sales-movement analysis.
- **Inventory Monitoring:** The system updates available quantities after a successful sale. It also records the batch affected by the transaction.
- **Batch and Expiry Tracking:** Each product batch has an expiry date and quantity. This allows the system to identify which products should be sold or reviewed first.
- **Sales-Movement Analysis:** The system analyzes how quickly a product is being sold. This information is compared with the product’s remaining shelf life.
- **Expiry-Risk Classification:** Products are classified as low risk, medium risk, high risk, or expired.
- **Waste-Reduction Alerts:** Managers receive alerts when products may expire before being sold.
- **Manager Approval:** Managers can approve or reject actions such as prioritizing display, discount review, or removal from sale.
- **Waste History:** The system records whether a product was sold normally, discounted, removed, or wasted.

### 3.2 Main Unique Feature
The main unique feature of FreshFlow POS is its expiry-risk and waste-reduction process.

The system will not only ask:  
*“How many products are left?”*

It will also ask:  
*“Will these products likely be sold before they expire?”*

This makes the system more focused than a normal POS because it connects sales information with product expiry and waste prevention.

---

## 4. Objectives and Scope

### 4.1 General Objective
To propose a web-based expiry-aware inventory and waste reduction system that uses checkout transactions, product batches, expiry dates, and sales movement to help a retail convenience store reduce product waste and improve inventory decisions.

### 4.2 Specific Objectives
FreshFlow POS aims to:
1. Record sales and inventory information in one transaction workflow.
2. Track products according to batch number and expiry date.
3. Deduct the correct quantity from the appropriate product batch.
4. Prioritize products with the earliest expiry date when applicable.
5. Classify products according to their expiry risk.
6. Analyze remaining stock and sales movement.
7. Identify products that may expire before being sold.
8. Notify managers about products that require attention.
9. Recommend waste-reduction actions for manager approval.
10. Record products that were sold, discounted, removed, or wasted.
11. Provide reports about expiry trends and product waste.
12. Apply authentication, authorization, HTTPS, validation, logging, and audit controls.
13. Prevent duplicate transactions using unique transaction IDs.
14. Test normal workflows, interface contracts, failure paths, and performance.

### 4.3 Scope of the Prototype
The prototype includes:
- Browser-based cashier and manager screens
- Product records
- Product-batch records
- Sale records
- Inventory records
- Payment-status records
- Receipt records
- Expiry-date tracking
- Expiry-risk classification
- Sales-movement monitoring
- Near-expiry alerts
- Waste-reduction recommendations
- Manager approval of actions
- Waste-history records
- Manager reports
- Authentication and role-based access
- HTTPS communication
- Server-side validation
- Audit logging
- Contract, interface, failure-path, and performance testing

### 4.4 Limitations of the Initial Scope
The following are outside the initial prototype:
- Direct bank integration
- Direct e-wallet integration
- Payment-gateway replacement
- Full accounting
- Payroll
- Automatic supplier procurement
- Automatic price changes without approval
- Full offline operation
- Automatic deployment to all branches
- Replacement of an existing POS
- Hardware-specific barcode design
- Automatic migration of historical records

Payment processing will initially be represented using PENDING, SUCCESS, and REJECTED statuses.

---

## 5. System Architecture and Workflow

### 5.1 Architecture Overview
FreshFlow POS will use a three-layer web application architecture.

| Layer | Responsibility | Examples |
| :--- | :--- | :--- |
| **Browser Interface** | Receives user input and displays results. | Process sales, view alerts, review waste |
| **Application Server** | Validates data, applies business rules, and controls access. | Calculate risk, update inventory, create alerts |
| **Database** | Stores durable and traceable records. | Products, batches, sales, expiry dates, alerts |

The application server will serve as the main control point for validation, authorization, transaction processing, expiry analysis, and alert generation.

### 5.2 Main System Workflow
1. The cashier signs in through the browser.
2. The system verifies the cashier’s identity and role.
3. The cashier scans or encodes the products.
4. The application server validates the product ID and quantity.
5. The system identifies the appropriate product batch.
6. The system calculates the transaction total.
7. The cashier selects a payment method.
8. The system records the payment status.
9. If payment is successful, the system records the sale.
10. The system deducts the quantity from the correct batch.
11. The system updates the remaining stock.
12. The system checks the affected batch’s expiry date.
13. The system analyzes the product’s sales movement.
14. The system calculates the product’s expiry risk.
15. The system creates an alert if action is required.
16. The system generates the receipt record.
17. The manager reviews and approves an action when necessary.
18. The system records the final action in the waste history.

### 5.3 Expiry-Aware Workflow
The main process of FreshFlow POS is:

$$\text{Sale recorded} \rightarrow \text{inventory updated} \rightarrow \text{batch identified} \rightarrow \text{expiry checked} \rightarrow \text{sales movement analyzed} \rightarrow \text{risk level calculated} \rightarrow \text{manager alerted} \rightarrow \text{action approved} \rightarrow \text{result recorded}$$

### 5.4 Transaction Consistency
A sale must not be considered fully completed unless the required transaction records are saved correctly.

If payment confirmation is incomplete, the sale must remain pending. If the inventory update fails after successful payment-status confirmation, the system must record the failure and mark the transaction for retry or manual review.

---

## 6. Integration Points and Interface Rules

### 6.1 Integration Point Register

| Integration Point | Source | Destination | Purpose |
| :--- | :--- | :--- | :--- |
| **Checkout Request** | Browser | Application Server | Sends the transaction request. |
| **Sale Record** | Application Server | Database | Stores the completed transaction. |
| **Inventory Update** | Sales Module | Inventory Module | Deducts the sold quantity. |
| **Batch Lookup** | Inventory Module | Batch Database | Identifies the correct product batch. |
| **Expiry-Risk Calculation** | Inventory Module | Expiry-Risk Module | Determines the product’s risk level. |
| **Alert Generation** | Expiry-Risk Module | Alert Module | Notifies the manager. |
| **Manager Approval** | Manager Interface | Application Server | Approves or rejects a recommended action. |
| **Waste History** | Application Server | Database | Records the final result. |
| **Reporting** | Database | Manager Interface | Displays management information. |

### 6.2 Data Format and Semantic Rules
FreshFlow POS will use JSON objects for internal data exchange, following standard JSON formatting rules (Bray, 2017).

Important fields include: `productId`, `saleId`, `batchId`, `expiryDate`, `quantity`, `remainingQuantity`, `salesRate`, `riskLevel`, `recommendedAction`, `paymentStatus`, and `wasteStatus`.

**Data Semantic Rules:**
- `productId` identifies one registered product.
- `saleId` identifies one unique transaction.
- `batchId` identifies one product batch.
- `quantity` means the number of individual sellable units.
- `unitPrice` means the price of one sellable unit.
- `totalAmount` means the total transaction value in Philippine pesos.
- `expiryDate` uses the format YYYY-MM-DD.
- `salesRate` represents the average units sold during the monitoring period.
- `riskLevel` may be LOW, MEDIUM, HIGH, or EXPIRED.
- `paymentStatus` may be PENDING, SUCCESS, or REJECTED.
- `wasteStatus` may be NOT_WASTED, DISCOUNTED, REMOVED, or WASTED.

### 6.3 First-Expiry, First-Out Rule
FreshFlow POS will follow the First-Expiry, First-Out or FEFO rule. This means the product batch with the earliest expiry date should be prioritized before batches that expire later.

FEFO is appropriate for products with expiry dates because it focuses on the actual expiry date instead of only the date when the product arrived. This helps reduce waste caused by expired stock (World Health Organization, n.d.).

### 6.4 Timeout and Retry Rules
The checkout request will be processed synchronously. The proposed rules are:
- A normal checkout request should respond within 10 seconds.
- If there is no response within 10 seconds, the transaction becomes PENDING.
- A pending transaction must not automatically become successful.
- Each transaction must use a unique saleId.
- The system must check whether the saleId was already processed.
- Failed inventory updates may be retried up to three times.
- Retry delays will use approximately 2-second, 4-second, and 8-second intervals.
- After the final failed retry, the system must record the failure and notify the responsible user.

### 6.5 Versioning Strategy
The first system interface will be identified as Version 1, or v1. Changes to required fields, data types, status values, or business rules must be documented. Major changes will receive a new version number, such as v2.

---

## 7. Expiry-Risk and Waste-Reduction Process

### 7.1 Expiry-Risk Classification
The system will examine: number of days before expiry, current remaining quantity, average sales movement, product category, batch information, and previous waste history.

| Risk Level | Condition | Suggested Action |
| :--- | :--- | :--- |
| **Low** | More than 30 days before expiry | Continue normal monitoring |
| **Medium** | 8 to 30 days before expiry | Review product movement |
| **High** | 1 to 7 days before expiry | Prioritize display or request manager action |
| **Expired** | Past the expiry date | Remove from sale and record the reason |

The store may adjust the number of days according to product category and management policy.

### 7.2 Example Scenario
A product has 20 units remaining, three days before expiry, and an average sales rate of two units per day. The system may classify the product as high risk because the remaining stock is greater than the estimated number of units that can be sold before expiry.

The system may recommend that the manager:
- Prioritize the product for display.
- Review an approved discount.
- Check whether the product information is accurate.
- Remove the product if it has already expired.

### 7.3 Manager Approval
The system will not automatically apply discounts or remove products without authorization. A manager must approve the recommended action. The system will record: Manager ID, Date and time, Product ID, Batch ID, Quantity affected, Action selected, Reason, and Result.

### 7.4 Waste History and Reports
The system will record whether the product was: sold normally, discounted, removed from sale, returned according to store policy, or recorded as wasted.

Reports may include:
- Products with the highest expiry risk
- Products frequently wasted
- Products frequently discounted
- Waste quantity by product
- Waste quantity by category
- Near-expiry products successfully sold
- Average time between alert and action
- Estimated inventory value lost through expiry

---

## 8. Security and Data Protection

### 8.1 Authentication and Authorization
Users must sign in before accessing FreshFlow POS.

**Cashiers may:** process sales, view product information, view transaction status, and generate receipts.

**Managers may:** view expiry-risk information, view waste reports, approve discounts or product removal, review stock and sales reports, review audit records, and approve authorized corrections.

Users may only perform actions allowed by their assigned role. Authentication and account-management controls should follow recognized digital identity practices (National Institute of Standards and Technology, 2025).

### 8.2 Transport Protection
All browser-to-server communication must use HTTPS. Sensitive user and transaction information must not be transmitted through unprotected communication (OWASP Foundation, 2025).

### 8.3 Input Validation
The application server must validate every request to verify that:
- Required fields are present.
- Product IDs exist.
- Batch IDs belong to the selected product.
- Quantities are positive and do not exceed available stock.
- Prices and totals are not negative.
- Expiry dates use the correct format.
- Payment statuses and risk levels are valid.
- The sale ID has not already been processed.
- The user is authorized to perform the action.

Invalid requests must be rejected and logged.

### 8.4 Logging and Auditability
The system will create audit records for: successful sales, inventory deductions, batch changes, risk-level changes, alert creation, manager approvals, discount approvals, product removals, waste records, rejected transactions, failed login attempts, authorization failures, timeout events, retry attempts, and system errors.

Each log should include the event ID, user ID, role, date and time, action, affected record, result, and error information when applicable. Logs must be protected from unauthorized editing. Access must be limited to authorized managers or administrators.

### 8.5 Performance Requirements
The initial prototype will be designed for:
- Approximately 10 concurrent users
- Approximately 30 completed transactions per minute during peak activity
- 2-second response time for common cashier actions
- 5-second target for normal checkout
- 5-second target for manager reports using prototype data

---

## 9. Testing and Verification

Testing will verify the normal operation, integration points, expiry-risk process, security controls, and failure behavior of FreshFlow POS. Integration testing will focus on interactions between system components, while contract testing will verify that exchanged data follows the agreed rules (International Software Testing Qualifications Board, n.d.).

### 9.1 Test Plan

| Test | Example / Input | Expected Result |
| :--- | :--- | :--- |
| **Unit Test** | Calculate days before expiry. | Correct risk period is calculated. |
| **Unit Test** | Calculate product sales movement. | The result matches the recorded sales data. |
| **Integration Test** | Complete a sale and inspect inventory. | Stock decreases from the correct batch. |
| **Contract Test** | Validate required transaction fields / submit missing fields. | Invalid request is rejected. |
| **Interface Test** | Send a valid checkout request. | The application server returns the correct response. |
| **FEFO Test** | Sell a product with multiple batches. | The earliest-expiring batch is prioritized. |
| **Expiry Test** | Set a batch within the warning period. | The correct risk level and alert are created. |
| **Waste Test** | Approve a product-removal action. | The action is recorded in waste history. |
| **Authorization Test** | Cashier attempts manager approval. | The request is rejected. |
| **Duplicate Test** | Submit the same sale ID twice. | The second transaction is not duplicated. |
| **Timeout Test** | Delay the server response past 10 seconds. | The transaction becomes pending. |
| **Failure Test** | Interrupt the inventory update. | The error is logged and marked for retry. |
| **Performance Test** | Simulate 10 users and 30 transactions per minute. | The system is evaluated against performance targets. |

### 9.2 Verification Conditions
The system should verify that:
- A valid sale deducts the correct quantity.
- The earliest-expiring batch is selected.
- Near-expiry products receive the correct risk level.
- High-risk products create alerts.
- Manager-approved actions are recorded.
- Expired products are removed from sale.
- Invalid requests are rejected.
- Duplicate sales are prevented.
- Unauthorized actions are blocked.
- Failed updates are marked for retry or review.

Each test must record the test ID, objective, preconditions, input data, expected result, actual result, pass or fail status, date, responsible person, and defect reference.

---

## 10. Risks, Constraints, and Mitigation

| Risk | Possible Effect | Mitigation |
| :--- | :--- | :--- |
| **Incorrect expiry date** | Wrong risk classification | Validate dates and require authorized corrections |
| **Wrong batch selected** | Older products may remain unsold | Use batch IDs and FEFO |
| **Duplicate transaction** | Stock may be deducted twice | Use unique sale IDs and controlled retries |
| **Network interruption** | Transaction may remain incomplete | Use pending status and timeout rules |
| **Unauthorized discount** | Product price may be changed improperly | Require manager approval and audit logging |
| **Unauthorized product removal** | Saleable stock may be removed | Use role-based authorization |
| **Incorrect sales movement** | Risk calculation may be inaccurate | Validate sales records |
| **Alert overload** | Employees may ignore alerts | Use priority levels and clear actions |
| **Database failure** | Recent records may be unavailable | Use backups, logging, and recovery procedures |
| **Existing-system incompatibility** | Deployment may be delayed | Conduct compatibility assessment |
| **External payment downtime** | Payment may remain pending | Keep external payment outside the prototype |

---

## 11. Implementation Methodology

The team will use short development cycles.

| Sprint | Main Work |
| :--- | :--- |
| **Sprint 1** | Define product, batch, sale, expiry, risk, alert, waste, and user records. |
| **Sprint 2** | Build authentication, product records, batch records, and basic checkout. |
| **Sprint 3** | Add inventory deduction, FEFO processing, and receipt records. |
| **Sprint 4** | Add expiry-risk classification, sales movement, and alerts. |
| **Sprint 5** | Add manager approval, waste history, logging, versioning, and failure handling. |
| **Sprint 6** | Conduct performance testing, fix defects, and prepare the final demonstration. |

---

## 12. Expected Benefits and Limitations

### 12.1 Expected Benefits
FreshFlow POS is expected to provide the following benefits:
- Reduced product waste
- Improved inventory accuracy
- Better stock rotation
- Earlier manager awareness
- More informed ordering decisions
- Recorded accountability for product actions
- Less manual monitoring
- Better visibility of expiry-related problems
- More reliable system processing

The system supports the broader goal of reducing food waste through improved measurement, monitoring, and early action (United Nations Environment Programme, 2024).

### 12.2 Limitations
FreshFlow POS cannot completely eliminate product waste. Employees must still encode correct expiry dates, follow stock-rotation procedures, review alerts, and perform approved actions.

The system will not guarantee that every product is sold before expiry. It will provide information, risk classifications, and recommendations that help employees act earlier.

The initial version will not provide full offline operation. It will depend on access to the web application and database. The system will not initially replace bank, e-wallet, accounting, payroll, procurement, or existing POS systems. The system must undergo a pilot test before being deployed to multiple branches.

---

## 13. Conclusion

FreshFlow POS is a proposed web-based expiry-aware inventory and waste reduction system designed for retail convenience stores.

Although the system includes common POS features such as checkout, inventory updates, receipt generation, and reporting, these are supporting functions. The main focus is to connect sales data with product batches, expiry dates, sales movement, risk classification, manager alerts, and waste-history records.

The system can identify products that may expire before being sold and help managers take action earlier. It can prioritize products with earlier expiry dates, provide expiry-risk classifications, recommend manager-approved actions, and record the final result.

The revised design also defines integration points, data meanings, FEFO rules, timeout behavior, retries, versioning, authentication, authorization, HTTPS protection, validation, audit logging, testing, performance requirements, and system limitations.

FreshFlow POS provides a focused solution to a specific retail problem: reducing product waste through better expiry and inventory management. The recommended prototype should begin with product and batch records, checkout, inventory deduction, expiry-risk classification, alerts, manager approval, and waste-history reporting.

---

## 14. Project References

- **Bray, T. (2017).** *The JavaScript Object Notation (JSON) data interchange format (RFC 8259).* Internet Engineering Task Force. https://doi.org/10.17487/RFC8259
- **Food and Agriculture Organization of the United Nations. (n.d.).** *Food loss and food waste database.* Retrieved October 17, 2026, from https://www.fao.org/policy-support/policy-themes/food-loss-and-food-waste/-Food-Loss-and-Food-Waste-Database/en
- **International Organization for Standardization. (2023).** *ISO/IEC 25010:2023: Systems and software engineering—Systems and software quality requirements and evaluation (SQuaRE)—Product quality model.* https://www.iso.org/standard/78176.html
- **International Software Testing Qualifications Board. (n.d.).** *Integration testing.* ISTQB Glossary. Retrieved October 17, 2026, from https://glossary.istqb.org/en_US/term/integration-testing
- **National Institute of Standards and Technology. (2025).** *Digital identity guidelines: Authentication and authenticator management (NIST Special Publication 800-63B-4).* https://doi.org/10.6028/NIST.SP.800-63b-4
- **OWASP Foundation. (2025).** *OWASP Top 10: The standard awareness document for developers and web application security.* https://owasp.org/projects/top-ten
- **United Nations Environment Programme. (2024).** *Food waste index report 2024.* https://www.unep.org/resources/publication/food-waste-index-report-2024
- **World Health Organization. (n.d.).** *Warehouse and stock management: First expiry, first out and first in, first out principles.* Retrieved October 17, 2026, from https://emanual.who.int/p17new/s09/Pages/9-3-4-Warehouse-and-Stock-Management.aspx
