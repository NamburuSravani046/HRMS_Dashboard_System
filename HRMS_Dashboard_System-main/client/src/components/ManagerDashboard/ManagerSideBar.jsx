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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get logged-in user from Redux
  const user = useSelector((state) => state.auth.user);

  // Get employee or manager name
  const employeeName =
    [
      user?.firstName || user?.first_name,
      user?.lastName || user?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || user?.name || "Employee";

  // Format Indian currency
  const currency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  // =====================================
  // LOAD PERSONAL PAYSLIPS
  // =====================================

  useEffect(() => {
    let active = true;

    setPayslips([]);
    setError("");

    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadPayslips = async () => {
      try {
        setLoading(true);

        const data = await getMyPayslips();

        if (active) {
          setPayslips(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          setError(error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPayslips();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // =====================================
  // DOWNLOAD PDF PAYSLIP
  // =====================================

  const downloadPayslip = (payroll) => {
    if (payroll.paymentStatus !== "PAID") {
      setError("Payslip is available only after payment.");
      return;
    }

    try {
      setError("");

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

      // Employee information

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);

      doc.text(
        `Employee Name: ${employeeName}`,
        15,
        50
      );

      doc.text(
        `Role: ${user?.role || "Employee"}`,
        15,
        59
      );

      doc.text(
        `Salary Period: ${period}`,
        15,
        68
      );

      doc.text(
        `Payment Status: ${payroll.paymentStatus}`,
        15,
        77
      );

      doc.text(
        `Payment Date: ${
          payroll.paidAt
            ? new Date(payroll.paidAt)
                .toLocaleDateString("en-IN")
            : "Not paid"
        }`,
        15,
        86
      );

      // Salary breakdown table

      autoTable(doc, {
        startY: 96,

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

        styles: {
          fontSize: 11,
          cellPadding: 4,
        },

        columnStyles: {
          1: {
            halign: "right",
          },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 15;

      // Net payable salary

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");

      doc.text(
        `Net Payable: ${pdfAmount(payroll.netSalary)}`,
        15,
        finalY
      );

      // Footer

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(
        "This is a computer-generated payslip.",
        105,
        finalY + 20,
        { align: "center" }
      );

      // Save PDF

      doc.save(
        `Payslip_${employeeName.replace(/\s+/g, "_")}_${payroll.month}_${payroll.year}.pdf`
      );

    } catch (error) {
      setError(
        "Unable to download payslip: " + error.message
      );
    }
  };

  // =====================================
  // SUMMARY CALCULATIONS
  // =====================================

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

  // =====================================
  // FRONTEND UI
  // =====================================

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* PAGE HEADING */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountBalanceWalletOutlined
          color="primary"
          sx={{ fontSize: 30 }}
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

      {/* ERROR MESSAGE */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* EMPLOYEE INFORMATION */}

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {employeeName}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ textTransform: "capitalize" }}
        >
          {user?.role || "Employee"}
        </Typography>
      </Paper>

      {/* SUMMARY CARDS */}

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
        {/* TOTAL SALARY */}

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

        {/* TOTAL PF */}

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Total PF Deducted
          </Typography>

          <Typography
            variant="h5"
            color="primary.main"
            fontWeight={700}
          >
            {currency(totalPF)}
          </Typography>
        </Paper>

        {/* PENDING PAYMENTS */}

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

      {/* MONTHLY PAYSLIP RECORDS */}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 3 }}
        >
          Monthly Salary Records
        </Typography>

        {loading ? (
          <Box
            sx={{
              textAlign: "center",
              py: 5,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1100 }}>

              {/* TABLE HEADER */}

              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#f1f5f9",
                  }}
                >
                  <TableCell>Salary Month</TableCell>

                  <TableCell>Basic Salary</TableCell>

                  <TableCell>Allowances</TableCell>

                  <TableCell>Gross Salary</TableCell>

                  <TableCell>PF Deduction</TableCell>

                  <TableCell>Other Deductions</TableCell>

                  <TableCell>Net Salary</TableCell>

                  <TableCell>Payment Status</TableCell>

                  <TableCell>Payment Date</TableCell>

                  <TableCell>Download</TableCell>
                </TableRow>
              </TableHead>

              {/* TABLE BODY */}

              <TableBody>
                {payslips.map((payroll) => (
                  <TableRow key={payroll.id} hover>

                    {/* MONTH */}

                    <TableCell>
                      {months[payroll.month - 1]}{" "}
                      {payroll.year}
                    </TableCell>

                    {/* BASIC SALARY */}

                    <TableCell>
                      {currency(payroll.basicSalary)}
                    </TableCell>

                    {/* ALLOWANCES */}

                    <TableCell>
                      {currency(
                        Number(payroll.hra || 0) +
                        Number(payroll.allowances || 0)
                      )}
                    </TableCell>

                    {/* GROSS SALARY */}

                    <TableCell>
                      {currency(payroll.grossSalary)}
                    </TableCell>

                    {/* PF DEDUCTION */}

                    <TableCell>
                      {currency(payroll.pfDeduction)}

                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {payroll.pfRate || 0}%
                      </Typography>
                    </TableCell>

                    {/* OTHER DEDUCTIONS */}

                    <TableCell>
                      {currency(
                        Number(
                          payroll.otherDeductions || 0
                        ) +
                        Number(
                          payroll.leaveDeduction || 0
                        )
                      )}
                    </TableCell>

                    {/* NET SALARY */}

                    <TableCell>
                      <Typography
                        color="success.main"
                        fontWeight={600}
                      >
                        {currency(payroll.netSalary)}
                      </Typography>
                    </TableCell>

                    {/* PAYMENT STATUS */}

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

                    {/* PAYMENT DATE */}

                    <TableCell>
                      {payroll.paidAt
                        ? new Date(
                            payroll.paidAt
                          ).toLocaleDateString("en-IN")
                        : "-"}
                    </TableCell>

                    {/* DOWNLOAD BUTTON */}

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

                {/* EMPTY RECORDS */}

                {payslips.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      align="center"
                      sx={{
                        py: 5,
                        color: "gray",
                      }}
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