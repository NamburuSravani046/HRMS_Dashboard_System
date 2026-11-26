import { useEffect, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from "@mui/material";

import {
  DownloadOutlined,
  CheckCircleOutline,
  CalculateOutlined,
} from "@mui/icons-material";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getEmployees,
  getSalaries,
  generatePayroll,
  getPayrolls,
  markAsPaid,
} from "../../../services/PayrollService/payrollService";

const months = [
  "January", "February", "March",
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December",
];

export default function PayrollManagement() {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("success");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const currency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  // Load data from backend
  const loadData = async () => {
    try {
      const [employeeData, salaryData, payrollData] =
        await Promise.all([
          getEmployees(),
          getSalaries(),
          getPayrolls(),
        ]);

      setEmployees(employeeData);
      setSalaries(salaryData);
      setPayrolls(payrollData);
    } catch (error) {
      setSeverity("error");
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get employee name
  const employeeName = (id) => {
    const employee = employees.find(
      (item) => item.id === id
    );

    return employee
      ? `${employee.first_name} ${employee.last_name}`
      : id;
  };

  // Employees with assigned salaries
  const assignedEmployees = employees.filter(
    (employee) =>
      salaries.some(
        (salary) => salary.userId === employee.id
      )
  );

  // Generate monthly payroll
  const handleGenerate = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await generatePayroll({
        userId: form.userId,
        month: Number(form.month),
        year: Number(form.year),
      });

      setSeverity("success");
      setMessage("Payroll generated successfully");

      await loadData();
    } catch (error) {
      setSeverity("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark salary as paid
  const handlePayment = async (id) => {
    if (!window.confirm(
      "Confirm that the employee salary has been paid?"
    )) {
      return;
    }

    try {
      setLoading(true);

      await markAsPaid(id);

      setSeverity("success");
      setMessage("Salary marked as paid successfully");

      await loadData();
    } catch (error) {
      setSeverity("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Download PDF payslip
  const downloadPayslip = (payroll) => {
    try {
      const doc = new jsPDF();

      const name = employeeName(payroll.userId);

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

      doc.text(`Employee Name: ${name}`, 15, 50);
      doc.text(`Salary Period: ${period}`, 15, 59);

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
        `Payslip_${name.replace(/\s+/g, "_")}_${payroll.month}_${payroll.year}.pdf`
      );
    } catch (error) {
      setSeverity("error");
      setMessage("Unable to download payslip: " + error.message);
    }
  };

  // Summary counts
  const totalPaid = payrolls.filter(
    (item) => item.paymentStatus === "PAID"
  ).length;

  const totalPending = payrolls.filter(
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
      <Typography variant="h5" fontWeight={700}>
        Payroll Management
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Generate monthly payroll and manage employee payments
      </Typography>

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
            Total Payroll Records
          </Typography>

          <Typography variant="h4" fontWeight={700}>
            {payrolls.length}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Paid Salaries
          </Typography>

          <Typography
            variant="h4"
            color="success.main"
            fontWeight={700}
          >
            {totalPaid}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Pending Salaries
          </Typography>

          <Typography
            variant="h4"
            color="warning.main"
            fontWeight={700}
          >
            {totalPending}
          </Typography>
        </Paper>
      </Box>

      {/* Generate Payroll Form */}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 3 }}
        >
          Generate Monthly Payroll
        </Typography>

        {message && (
          <Alert severity={severity} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleGenerate}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "2fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            <TextField
              select
              required
              fullWidth
              label="Select Employee"
              value={form.userId}
              onChange={(e) =>
                setForm({
                  ...form,
                  userId: e.target.value,
                })
              }
            >
              {assignedEmployees.map((employee) => (
                <MenuItem
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.first_name}{" "}
                  {employee.last_name}
                  {" - "}
                  {employee.role}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Month"
              value={form.month}
              onChange={(e) =>
                setForm({
                  ...form,
                  month: e.target.value,
                })
              }
            >
              {months.map((month, index) => (
                <MenuItem
                  key={month}
                  value={index + 1}
                >
                  {month}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              required
              fullWidth
              type="number"
              label="Year"
              value={form.year}
              inputProps={{
                min: 2000,
                max: 9999,
                step: 1,
              }}
              onChange={(e) =>
                setForm({
                  ...form,
                  year: e.target.value,
                })
              }
            />
          </Box>

          {assignedEmployees.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Assign a salary to an employee before
              generating payroll.
            </Alert>
          )}

          <Box
            sx={{
              mt: 3,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !form.userId}
              startIcon={<CalculateOutlined />}
            >
              {loading ? "Processing..." : "Generate Payroll"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Payroll Records Table */}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 3 }}
        >
          Employee Payroll Records
        </Typography>

        <TableContainer>
          <Table sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow
                sx={{ backgroundColor: "#f1f5f9" }}
              >
                <TableCell>Employee</TableCell>
                <TableCell>Month</TableCell>
                <TableCell>Gross Salary</TableCell>
                <TableCell>PF Deduction</TableCell>
                <TableCell>Other Deductions</TableCell>
                <TableCell>Net Salary</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {payrolls.map((payroll) => (
                <TableRow key={payroll.id} hover>
                  <TableCell>
                    {employeeName(payroll.userId)}
                  </TableCell>

                  <TableCell>
                    {months[payroll.month - 1]}{" "}
                    {payroll.year}
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
                      fontWeight={600}
                      color="success.main"
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
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      {payroll.paymentStatus ===
                        "PENDING" && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={loading}
                          startIcon={<CheckCircleOutline />}
                          onClick={() =>
                            handlePayment(payroll.id)
                          }
                        >
                          Mark Paid
                        </Button>
                      )}

                      <Button
                        size="small"
                        variant="outlined"
                        disabled={
                          payroll.paymentStatus !== "PAID"
                        }
                        startIcon={<DownloadOutlined />}
                        onClick={() =>
                          downloadPayslip(payroll)
                        }
                      >
                        Payslip
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {payrolls.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 5, color: "gray" }}
                  >
                    No payroll records generated yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}