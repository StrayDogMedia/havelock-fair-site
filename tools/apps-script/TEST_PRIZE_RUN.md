# Test: award three placings and run the money chain

**~10 minutes.** This exercises the half of the workbook that has never run on live data:
RESULTS → PRIZE CALCULATIONS → CHEQUE REGISTER. Everything upstream is proven; this is not.

**The numbers below are predicted in advance.** That is the point — if the workbook produces
something else, we have found a real problem, and "it produced *a* number" is not a pass.

---

## ⚠️ Read this before you start

**Do the test, look at it, then undo it.** Instructions to clear it are at the bottom. Nothing
here is destructive, but leaving test placings in RESULTS would mean:

- 🔴 **`HF_buildEntries` will refuse to run** while placings exist. That guard is deliberate.
  If a late registration arrives, you must clear RESULTS before you can rebuild.

Also: `HF_calculatePrizes` **writes back into RESULTS** — it fills in the exhibitor, class,
prize tier and amounts beside each placing. That is expected, not a bug.

---

## Step 1 — type three placings into RESULTS

Open the **RESULTS** tab. Fill only these two columns, on three consecutive rows:

| ENTRY # | PLACING |
|---|---|
| `E1001` | `1st` |
| `E1005` | `2nd` |
| `E1009` | `1st` |

Leave every other column blank. Don't touch DONATED?.

**Why these three** — each proves a different rule:

- **E1001** — Claudia Deschamps, Class 14 Maple syrup golden. An adult, so she should
  **pay the $15 membership fee**.
- **E1005** — Kingsbury Riley, Youth Class 26 ("12 & under"). The fee should be **waived**,
  with no under-13 checkbox anywhere in her registration — the workbook has to work that out
  from the youth class alone.
- **E1009** — Sarah Kobel, 4-H. Position-only. She should be **priced $0 and never reach the
  cheque register**, even though she placed 1st.

## Step 2 — run the two menu items

🏆 Havelock Fair → **3. Calculate prizes & cheques**, then **4. Verify before writing cheques**.

---

## Step 3 — check it against these exact numbers

### PRIZE CALCULATIONS should read

| EXHIBITOR # | NAME | TOTAL PRIZES | DONATED | MEMBERSHIP FEE | NET CHEQUE |
|---|---|---|---|---|---|
| HF2026-1001 | Claudia Deschamps | **15** | 0 | **15** | **0** |
| HF2026-1003 | Kingsbury Riley | **18** | 0 | **0** | **18** |
| HF2026-1009 | Sarah Kobel | **0** | 0 | **15** | **0** |

### CHEQUE REGISTER should list exactly ONE cheque

| # | EXHIBITOR # | PAYABLE TO | AMOUNT |
|---|---|---|---|
| 1 | HF2026-1003 | Kingsbury Riley | **$18** |

### HF_verify should say `✅ ALL CHECKS PASSED`

---

## What each number proves

- **Claudia nets $0.** She won $15 and the $15 membership fee cancels it exactly. Correct, and
  worth seeing once before fair day so nobody reads a $0 as a bug. A first place in a cheap
  section does not clear the fee.
- **Riley nets $18 with no fee.** The under-13 waiver resolved from Youth Class 26 alone.
- **Sarah gets no cheque at all** despite placing 1st — 4-H is position-only.
- **Only one cheque is written** from three placings.

## 🔴 If a number differs

Stop and tell me which one. In particular:

- **Claudia showing a $0 fee** would mean the under-13 resolution is misfiring on adults —
  the fair would underpay itself on every adult exhibitor.
- **Sarah appearing in the cheque register** would mean 4-H is being priced.
- **`HF_verify` failing** names the mismatch on the failing line.

---

## Step 4 — undo the test

1. In **RESULTS**, delete the three rows you typed — including the columns
   `HF_calculatePrizes` filled in beside them.
2. Re-run **3. Calculate prizes & cheques**. With no placings, PRIZE CALCULATIONS and
   CHEQUE REGISTER empty themselves.
3. Run **4. Verify** once more — it should pass with `0 placing(s) recorded`.

Then `HF_buildEntries` is free to run again, which matters if any late registration arrives
before fair day.

> If you would rather keep the test data to show Rommy, that is fine — but **clear it before
> judging starts**, and remember the rebuild guard until you do.
