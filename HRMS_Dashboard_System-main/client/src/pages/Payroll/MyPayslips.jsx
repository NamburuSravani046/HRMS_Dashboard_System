import { useEffect, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";

import {
  DownloadOutlined,
  AccountBalanceWalletOutlined,
} from "@mui/icons-material";

import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getMyPayslips,
} from "../../services/PayrollService/payrollService";

const months = [
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December",
];

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useSelector((state) => state.auth?.user);

  const employeeName =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ") || "Employee";

  const currency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  // Load logged-in user's payslips
  const loadPayslips = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyPayslips();

      setPayslips(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, []);

  // Download payslip as PDF
  const downloadPayslip = (payroll) => {
    try {
      const doc = new jsPDF();

      const period =
        `${months[payroll.month - 1]} ${payroll.year}`;

      const pdfAmount = (value) =>
        `INR ${Number(value || 0).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`;

      // Company header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);

      doc.text("DigiX Technologies", 105, 16, {
        align: "center",
      });

      doc.setFontSize(13);

      doc.text("MONTHLY SALARY PAYSLIP", 105, 27, {
        align: "center",
      });

      // Employee details
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);

      doc.text(
        `Employee Name: ${employeeName}`,
        15,
        50
      );

      doc.text(
        `Salary Period: ${period}`,
        15,
        59
      );

      doc.text(
        `Payment Status: ${payroll.paymentStatus}`,
        15,
        68
      );

      doc.text(
        `Payment Date: ${
          payroll.paidAt
            ? new Date(payroll.paidAt)
                .toLocaleDateString("en-IN")
            : "Not paid"
        }`,
        15,
        77
      );

      // Salary breakdown
      autoTable(doc, {
        startY: 87,

        head: [["Salary Component", "Amount"]],

        body: [
          [
            "Basic Salary",
            pdfAmount(payroll.basicSalary),
          ],
          [
            "Total Allowances",
            pdfAmount(
              Number(payroll.hra || 0) +
              Number(payroll.allowances || 0)
            ),
          ],
          [
            "Gross Salary",
            pdfAmount(payroll.grossSalary),
          ],
          [
            `PF Deduction (${payroll.pfRate || 0}%)`,
            pdfAmount(payroll.pfDeduction),
          ],
          [
            "Other Deductions",
            pdfAmount(payroll.otherDeductions),
          ],
          [
            "Leave Deduction",
            pdfAmount(payroll.leaveDeduction),
          ],
          [
            "Net Salary",
            pdfAmount(payroll.netSalary),
          ],
        ],

        theme: "grid",

        headStyles: {
          fillColor: [30, 64, 175],
        },
      });

      const finalY = doc.lastAutoTable.finalY + 15;

      doc.setFontSize(14);

      doc.text(
        `Net Payable: ${pdfAmount(payroll.netSalary)}`,
        15,
        finalY
      );

      doc.setFontSize(10);

      doc.text(
        "This is a computer-generated payslip.",
        105,
        finalY + 20,
        { align: "center" }
      );

      doc.save(
        `Payslip_${employeeName.replace(/\s+/g, "_")}_${payroll.month}_${payroll.year}.pdf`
      );
    } catch (error) {
      setError(error.message);
    }
  };

  // Summary calculations
  const paidPayslips = payslips.filter(
    (item) => item.paymentStatus === "PAID"
  );

  const totalReceived = paidPayslips.reduce(
    (total, item) =>
      total + Number(item.netSalary || 0),
    0
  );

  const totalPF = paidPayslips.reduce(
    (total, item) =>
      total + Number(item.pfDeduction || 0),
    0
  );

  const pendingCount = payslips.filter(
    (item) => item.paymentStatus === "PENDING"
  ).length;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* Page Heading */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountBalanceWalletOutlined
          color="primary"
        />

        <Typography variant="h5" fontWeight={700}>
          My Payslips
        </Typography>
      </Box>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        View your salary details and download monthly
        payslips
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Total Salary Received
          </Typography>

          <Typography
            variant="h5"
            color="success.main"
            fontWeight={700}
          >
            {currency(totalReceived)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Total PF Deducted
          </Typography>

          <Typography
            variant="h5"
            color="primary"
            fontWeight={700}
          >
            {currency(totalPF)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Pending Payments
          </Typography>

          <Typography
            variant="h5"
            color="warning.main"
            fontWeight={700}
          >
            {pendingCount}
          </Typography>
        </Paper>
      </Box>

      {/* Payslip Records */}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 3 }}
        >
          Monthly Salary Records
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow
                  sx={{ backgroundColor: "#f1f5f9" }}
                >
                  <TableCell>Salary Month</TableCell>
                  <TableCell>Basic Salary</TableCell>
                  <TableCell>Gross Salary</TableCell>
                  <TableCell>PF Deduction</TableCell>
                  <TableCell>Other Deductions</TableCell>
                  <TableCell>Net Salary</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Download</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {payslips.map((payroll) => (
                  <TableRow key={payroll.id} hover>
                    <TableCell>
                      {months[payroll.month - 1]}{" "}
                      {payroll.year}
                    </TableCell>

                    <TableCell>
                      {currency(payroll.basicSalary)}
                    </TableCell>

                    <TableCell>
                      {currency(payroll.grossSalary)}
                    </TableCell>

                    <TableCell>
                      {currency(payroll.pfDeduction)}
                    </TableCell>

                    <TableCell>
                      {currency(
                        Number(payroll.otherDeductions || 0) +
                        Number(payroll.leaveDeduction || 0)
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography
                        color="success.main"
                        fontWeight={600}
                      >
                        {currency(payroll.netSalary)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={payroll.paymentStatus}
                        color={
                          payroll.paymentStatus === "PAID"
                            ? "success"
                            : "warning"
                        }
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadOutlined />}
                        disabled={
                          payroll.paymentStatus !== "PAID"
                        }
                        onClick={() =>
                          downloadPayslip(payroll)
                        }
                      >
                        Payslip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {payslips.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 5, color: "gray" }}
                    >
                      No payslips available yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}