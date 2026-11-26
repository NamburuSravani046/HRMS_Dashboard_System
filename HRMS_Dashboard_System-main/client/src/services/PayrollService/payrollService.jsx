const BASE_URL = "http://localhost:5000/payroll";

const request = async (endpoint, method = "GET", body) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
};

export const getEmployees = () =>
  request("/employees");

export const getSalaries = () =>
  request("/salary");

export const assignSalary = (data) =>
  request("/salary", "POST", data);

export const generatePayroll = (data) =>
  request("/generate", "POST", data);

export const getPayrolls = () =>
  request("/records");

export const markAsPaid = (id) =>
  request(`/${id}/paid`, "PATCH");

export const getMyPayslips = () =>
  request("/my-payslips");