import React, { useEffect, useState } from "react";

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
  Alert,
  Chip,
} from "@mui/material";

import {
  AccountBalanceWalletOutlined,
  SaveOutlined,
  EditOutlined,
} from "@mui/icons-material";

import {
  getEmployees,
  getSalaries,
  assignSalary,
} from "../../../services/PayrollService/payrollService";

const initialForm = {
  userId: "",
  basicSalary: "",
  hra: 0,
  allowances: 0,
  deductions: 0,
};

const SalaryManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("success");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [employeeData, salaryData] =
        await Promise.all([
          getEmployees(),
          getSalaries(),
        ]);

      setEmployees(employeeData);
      setSalaries(salaryData);
    } catch (error) {
      setSeverity("error");
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const grossSalary =
    Number(form.basicSalary) +
    Number(form.hra) +
    Number(form.allowances);

  const netSalary =
    grossSalary - Number(form.deductions);

  const currency = (value) =>
    Number(value).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (netSalary < 0) {
      setSeverity("error");
      setMessage("Deductions cannot exceed gross salary");
      return;
    }

    try {
      setSaving(true);

      await assignSalary(form);

      setSeverity("success");
      setMessage("Salary saved successfully");

      setForm(initialForm);

      await loadData();
    } catch (error) {
      setSeverity("error");
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const employeeName = (id) => {
    const employee = employees.find(
      (item) => item.id === id
    );

    return employee
      ? `${employee.first_name} ${employee.last_name}`
      : id;
  };

  const handleEdit = (salary) => {
    setForm({
      userId: salary.userId,
      basicSalary: salary.basicSalary,
      hra: salary.hra,
      allowances: salary.allowances,
      deductions: salary.deductions,
    });

    setMessage("");
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* Page Heading */}

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: "#1e293b" }}
        >
          Salary Management
        </Typography>

        <Typography color="text.secondary">
          Assign and manage employee salary structures
        </Typography>
      </Box>

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
            Total Salary Records
          </Typography>

          <Typography variant="h4" fontWeight={700}>
            {salaries.length}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Gross Monthly Salary
          </Typography>

          <Typography
            variant="h5"
            fontWeight={700}
            color="primary"
          >
            {currency(grossSalary)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            Net Monthly Salary
          </Typography>

          <Typography
            variant="h5"
            fontWeight={700}
            color="success.main"
          >
            {currency(netSalary)}
          </Typography>
        </Paper>
      </Box>

      {/* Salary Form */}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
          }}
        >
          <AccountBalanceWalletOutlined color="primary" />

          <Typography variant="h6" fontWeight={600}>
            Employee Salary Details
          </Typography>
        </Box>

        {message && (
          <Alert severity={severity} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>

          <TextField
            select
            fullWidth
            required
            label="Select Employee"
            name="userId"
            value={form.userId}
            onChange={handleChange}
            sx={{ mb: 3 }}
          >
            <MenuItem value="">
              Select Employee
            </MenuItem>

            {employees.map((employee) => (
              <MenuItem
                key={employee.id}
                value={employee.id}
              >
                {employee.first_name}{" "}
                {employee.last_name}
                {" — "}
                {employee.role}
              </MenuItem>
            ))}
          </TextField>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            <TextField
              fullWidth
              required
              label="Basic Salary (₹)"
              name="basicSalary"
              type="number"
              value={form.basicSalary}
              onChange={handleChange}
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              fullWidth
              required
              label="House Rent Allowance (HRA)"
              name="hra"
              type="number"
              value={form.hra}
              onChange={handleChange}
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              fullWidth
              required
              label="Other Allowances (₹)"
              name="allowances"
              type="number"
              value={form.allowances}
              onChange={handleChange}
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              fullWidth
              required
              label="Deductions (₹)"
              name="deductions"
              type="number"
              value={form.deductions}
              onChange={handleChange}
              inputProps={{
                min: 0,
                max: grossSalary,
                step: "0.01",
              }}
            />
          </Box>

          {/* Action Buttons */}

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 3,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => {
                setForm(initialForm);
                setMessage("");
              }}
            >
              Reset
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={<SaveOutlined />}
            >
              {saving ? "Saving..." : "Save Salary"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Employee Salary Records */}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 3 }}
        >
          Employee Salary Records
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                <TableCell>Employee</TableCell>
                <TableCell>Basic Salary</TableCell>
                <TableCell>HRA</TableCell>
                <TableCell>Allowances</TableCell>
                <TableCell>Gross Salary</TableCell>
                <TableCell>Deductions</TableCell>
                <TableCell>Net Salary</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {salaries.map((salary) => {
                const gross =
                  Number(salary.basicSalary) +
                  Number(salary.hra) +
                  Number(salary.allowances);

                const net =
                  gross - Number(salary.deductions);

                return (
                  <TableRow key={salary.id} hover>
                    <TableCell>
                      {employeeName(salary.userId)}
                    </TableCell>

                    <TableCell>
                      {currency(salary.basicSalary)}
                    </TableCell>

                    <TableCell>
                      {currency(salary.hra)}
                    </TableCell>

                    <TableCell>
                      {currency(salary.allowances)}
                    </TableCell>

                    <TableCell>
                      {currency(gross)}
                    </TableCell>

                    <TableCell>
                      {currency(salary.deductions)}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={currency(net)}
                        color="success"
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlined />}
                        onClick={() => handleEdit(salary)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {salaries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 5, color: "gray" }}
                  >
                    No employee salary records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SalaryManagement;