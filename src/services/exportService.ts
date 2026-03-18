/**
 * Export Service — Generate CSV and PDF reports from expense data.
 */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Expense } from "../types";
import { formatCurrency } from "./currencyService";

/**
 * Export expenses to a CSV string and share the file.
 */
export async function exportToCSV(
  expenses: Expense[],
  defaultCurrency: string = "INR",
): Promise<void> {
  const header =
    "Date,Description,Amount,Currency,Category,Paid By,Group,Split Type,Tags\n";

  const rows = expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((e) => {
      const date = new Date(e.date).toLocaleDateString("en-IN");
      const desc = escapeCSV(e.description);
      const amount = e.amount.toFixed(2);
      const currency = (e as any).currency || defaultCurrency;
      const category = e.category;
      const paidBy = escapeCSV(e.paidBy.name);
      const group = e.groupId ? escapeCSV(e.groupId) : "Personal";
      const splitType = e.splitType;
      const tags = escapeCSV(e.tags.join(", "));

      return `${date},${desc},${amount},${currency},${category},${paidBy},${group},${splitType},${tags}`;
    })
    .join("\n");

  const csv = header + rows;
  const fileUri = `${FileSystem.cacheDirectory}splitwise_expenses_${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Export Expenses",
      UTI: "public.comma-separated-values-text",
    });
  }
}

/**
 * Export expenses as a styled PDF and share.
 */
export async function exportToPDF(
  expenses: Expense[],
  userName: string = "User",
  defaultCurrency: string = "INR",
): Promise<void> {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totalAmount = sorted.reduce((sum, e) => sum + e.amount, 0);

  const rows = sorted
    .map((e) => {
      const date = new Date(e.date).toLocaleDateString("en-IN");
      const currency = (e as any).currency || defaultCurrency;
      return `
        <tr>
          <td>${date}</td>
          <td>${escapeHTML(e.description)}</td>
          <td>${e.category}</td>
          <td style="text-align:right">${formatCurrency(e.amount, currency)}</td>
          <td>${escapeHTML(e.paidBy.name)}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <html>
    <head>
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #5bc5a7; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .summary-card { background: #f8f9fa; border-radius: 8px; padding: 16px; flex: 1; }
        .summary-card .label { font-size: 12px; color: #666; }
        .summary-card .value { font-size: 20px; font-weight: bold; color: #5bc5a7; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #5bc5a7; color: #fff; text-align: left; padding: 10px 8px; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 20px; text-align: center; color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>Expense Report</h1>
      <p class="subtitle">Generated for ${escapeHTML(userName)} on ${new Date().toLocaleDateString("en-IN")}</p>

      <div class="summary">
        <div class="summary-card">
          <div class="label">Total Expenses</div>
          <div class="value">${sorted.length}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Amount</div>
          <div class="value">${formatCurrency(totalAmount, defaultCurrency)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th style="text-align:right">Amount</th>
            <th>Paid By</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <p class="footer">Splitwise Clone — Expense Report</p>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Export Expenses PDF",
      UTI: "com.adobe.pdf",
    });
  }
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
