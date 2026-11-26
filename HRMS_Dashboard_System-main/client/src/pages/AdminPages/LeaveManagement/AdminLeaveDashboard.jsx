
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { toast } from "react-toastify";

import {
  approveLeaveRequest,
  getAllManagerLeaveRequests,
  rejectLeaveRequest,
} from "../../../services/AdminService/leaveService";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB")
    : "N/A";

export default function AdminLeaveDashboard() {
  const [tab, setTab] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [remark, setRemark] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter] = useState("all");

  const [dataFilter, setDataFilter] = useState("all");
  const [totalPages, setTotalPages] = useState(1);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const queryStatus =
    tab === 0
      ? dataFilter === "all"
        ? "all"
        : dataFilter.toUpperCase()
      : statusFilter === "all"
        ? "PENDING"
        : statusFilter.toUpperCase();

  // ====================================
  // GET LEAVE REQUESTS
  // ====================================

  const getLeaves = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getAllManagerLeaveRequests({
        page,
        limit: 10,
        status: queryStatus,
      });

      if (!response.success) {
        toast.error(
          response.message || "Could not fetch leave requests"
        );
        return;
      }

      const rows = Array.isArray(response.data)
        ? response.data
        : [];

      const formatted = rows.map((item) => ({
        id: item.id,
        userName:
          item.employee?.first_name ||
          item.employee?.email ||
          "N/A",
        leaveType: item.LeaveType?.name || "N/A",
        startDate: formatDate(item.startDate),
        endDate: formatDate(item.endDate),
        appliedOn: formatDate(item.createdAt),
        daysRequested: item.daysRequested,
        reason: item.reason,
        status: String(item.status || "").toLowerCase(),
      }));

      setLeaves(formatted);
      setTotalPages(
        Math.max(1, Number(response.totalPages) || 1)
      );
      setSelected([]);
    } catch (error) {
      toast.error(
        error.message || "Could not load leave requests"
      );
    } finally {
      setLoading(false);
    }
  }, [page, queryStatus]);

  useEffect(() => {
    getLeaves();
  }, [getLeaves]);

  // ====================================
  // TAB CHANGE
  // ====================================

  const changeTab = (_event, value) => {
    setTab(value);
    setPage(1);
    setSelected([]);
    setExpandedId(null);
  };

  // ====================================
  // SELECT LEAVE REQUEST
  // ====================================

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // ====================================
  // APPROVE SINGLE LEAVE
  // ====================================

  const handleApprove = async (id) => {
    setProcessing(true);

    try {
      const response = await approveLeaveRequest(id);

      if (!response.success) {
        toast.error(response.message || "Approval failed");
        return;
      }

      toast.success(response.message || "Leave approved");
      setExpandedId(null);

      await getLeaves();
    } catch (error) {
      toast.error(error.message || "Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  // ====================================
  // APPROVE ALL SELECTED LEAVES
  // ====================================

  const handleBulkApprove = async () => {
    const ids = selected.filter((id) =>
      leaves.some(
        (leave) =>
          leave.id === id && leave.status === "pending"
      )
    );

    if (!ids.length) {
      toast.error("Select at least one pending request");
      return;
    }

    setProcessing(true);

    let approved = 0;
    const failures = [];

    try {
      for (const id of ids) {
        try {
          const response = await approveLeaveRequest(id);

          if (response.success) {
            approved += 1;
          } else {
            failures.push(
              response.message || `Could not approve ${id}`
            );
          }
        } catch (error) {
          failures.push(
            error.message || `Could not approve ${id}`
          );
        }
      }

      if (approved > 0) {
        toast.success(
          `${approved} leave request(s) approved`
        );
      }

      if (failures.length > 0) {
        toast.error(
          `${failures.length} failed: ${failures[0]}`
        );
      }

      await getLeaves();
    } finally {
      setProcessing(false);
    }
  };

  // ====================================
  // OPEN REJECTION DIALOG
  // ====================================

  const handleRejectOpen = (id) => {
    setRejectId(id);
    setRemark("");
    setRejectDialog(true);
  };

  // ====================================
  // REJECT SINGLE OR MULTIPLE LEAVES
  // ====================================

  const handleRejectSubmit = async () => {
    if (!remark.trim()) {
      toast.error("Remark is required");
      return;
    }

    const ids =
      rejectId === "bulk"
        ? selected
        : [rejectId];

    if (!ids.length || !ids[0]) {
      return;
    }

    setProcessing(true);

    let rejected = 0;
    const failures = [];

    try {
      for (const id of ids) {
        try {
          const response = await rejectLeaveRequest(
            id,
            remark.trim()
          );

          if (response.success) {
            rejected += 1;
          } else {
            failures.push(
              response.message || `Could not reject ${id}`
            );
          }
        } catch (error) {
          failures.push(
            error.message || `Could not reject ${id}`
          );
        }
      }

      if (rejected > 0) {
        toast.success(
          `${rejected} leave request(s) rejected`
        );
      }

      if (failures.length > 0) {
        toast.error(
          `${failures.length} failed: ${failures[0]}`
        );
      }

      setRejectDialog(false);
      setRemark("");
      setRejectId(null);
      setExpandedId(null);

      await getLeaves();
    } finally {
      setProcessing(false);
    }
  };

  // ====================================
  // FILTER LEAVE REQUESTS
  // ====================================

  const visibleLeaves =
    tab === 0
      ? leaves.filter((leave) =>
          dataFilter === "all"
            ? leave.status !== "pending"
            : leave.status === dataFilter
        )
      : leaves.filter((leave) =>
          statusFilter === "all"
            ? leave.status === "pending"
            : leave.status === statusFilter
        );

  const pendingCount =
    tab === 1
      ? visibleLeaves.filter(
          (leave) => leave.status === "pending"
        ).length
      : 0;

  return (
    <Box p={1}>
      {/* TABS */}

      <Tabs
        value={tab}
        onChange={changeTab}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Leave Data" />

        <Tab
          label={
            <Badge
              badgeContent={pendingCount}
              color="error"
            >
              Leave Requests
            </Badge>
          }
        />
      </Tabs>

      {/* BULK ACTION BUTTONS */}

      {tab === 1 && selected.length > 0 && (
        <Box
          mt={2}
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Typography>
            {selected.length} selected
          </Typography>

          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="success"
              disabled={processing}
              onClick={handleBulkApprove}
            >
              Accept All
            </Button>

            <Button
              variant="contained"
              color="error"
              disabled={processing}
              onClick={() => handleRejectOpen("bulk")}
            >
              Reject All
            </Button>
          </Box>
        </Box>
      )}

      {/* LEAVE DATA FILTER */}

      {tab === 0 && (
        <Box
          display="flex"
          justifyContent="flex-end"
          mt={2}
        >
          <FormControl
            size="small"
            sx={{ width: 200 }}
          >
            <InputLabel>Status</InputLabel>

            <Select
              value={dataFilter}
              label="Status"
              onChange={(e) => {
                setDataFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">
                Approved
              </MenuItem>
              <MenuItem value="rejected">
                Rejected
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* TABLE HEADER */}

      <Box
        sx={{
          display: {
            xs: "none",
            md: "flex",
          },
          alignItems: "center",
          px: 2,
          py: 1,
          mt: 3,
          borderBottom: "2px solid #e0e0e0",
        }}
      >
        {tab === 1 && (
          <Typography sx={{ width: "5%" }}>
            ✓
          </Typography>
        )}

        <Typography sx={{ width: "5%" }}>
          Sr.
        </Typography>

        <Box
          sx={{
            flex: 1,
            display: "flex",
          }}
        >
          <Typography sx={{ width: "24%" }}>
            Name
          </Typography>

          <Typography sx={{ width: "24%" }}>
            Type
          </Typography>

          <Typography sx={{ width: "18%" }}>
            From
          </Typography>

          <Typography sx={{ width: "18%" }}>
            To
          </Typography>

          <Typography sx={{ width: "16%" }}>
            Status
          </Typography>
        </Box>
      </Box>

      {/* LEAVE REQUEST LIST */}

      <Box mt={2}>
        {loading ? (
          <Typography
            textAlign="center"
            py={5}
          >
            Loading leave requests...
          </Typography>
        ) : visibleLeaves.length === 0 ? (
          <Typography
            textAlign="center"
            py={5}
            sx={{ opacity: 0.7 }}
          >
            {tab === 0
              ? "No leave history found"
              : "No pending leave requests"}
          </Typography>
        ) : (
          visibleLeaves.map((leave, index) => (
            <Card
              key={leave.id}
              sx={{
                mb: 1,
                borderRadius: 1.5,
                boxShadow: "none",
                border: "1px solid #eee",
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  "&:last-child": {
                    pb: 0,
                  },
                }}
              >
                {/* LEAVE ROW */}

                <Box
                  onClick={() =>
                    setExpandedId((prev) =>
                      prev === leave.id
                        ? null
                        : leave.id
                    )
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 1.5,
                    cursor: "pointer",
                  }}
                >
                  {tab === 1 &&
                    leave.status === "pending" && (
                      <Checkbox
                        size="small"
                        checked={selected.includes(
                          leave.id
                        )}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        onChange={() =>
                          handleSelect(leave.id)
                        }
                        disabled={processing}
                        sx={{ width: "5%" }}
                      />
                    )}

                  <Typography
                    sx={{
                      width: "5%",
                      mr: 1,
                      fontWeight: 600,
                    }}
                  >
                    {(page - 1) * 10 + index + 1}
                  </Typography>

                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                      gap: {
                        xs: 1,
                        md: 0,
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        width: {
                          xs: "100%",
                          md: "24%",
                        },
                      }}
                    >
                      {leave.userName.split("@")[0]}
                    </Typography>

                    <Typography
                      sx={{
                        width: {
                          xs: "100%",
                          md: "24%",
                        },
                      }}
                    >
                      {leave.leaveType}
                    </Typography>

                    <Typography
                      sx={{
                        width: {
                          xs: "100%",
                          md: "18%",
                        },
                      }}
                    >
                      {leave.startDate}
                    </Typography>

                    <Typography
                      sx={{
                        width: {
                          xs: "100%",
                          md: "18%",
                        },
                      }}
                    >
                      {leave.endDate}
                    </Typography>

                    <Typography
                      sx={{
                        width: {
                          xs: "100%",
                          md: "16%",
                        },
                        fontWeight: 600,
                        color:
                          leave.status === "approved"
                            ? "success.main"
                            : leave.status === "rejected"
                              ? "error.main"
                              : "warning.main",
                        textTransform: "capitalize",
                      }}
                    >
                      {leave.status}
                    </Typography>
                  </Box>
                </Box>

                {/* EXPANDED LEAVE DETAILS */}

                <Collapse
                  in={expandedId === leave.id}
                >
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "1fr 1fr",
                          md: "repeat(3, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          fontWeight={600}
                          fontSize={13}
                        >
                          Applied On
                        </Typography>

                        <Typography>
                          {leave.appliedOn}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography
                          fontWeight={600}
                          fontSize={13}
                        >
                          Total Days
                        </Typography>

                        <Typography>
                          {leave.daysRequested} Days
                        </Typography>
                      </Box>

                      <Box>
                        <Typography
                          fontWeight={600}
                          fontSize={13}
                        >
                          Status
                        </Typography>

                        <Typography
                          sx={{
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {leave.status}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          gridColumn: {
                            md: "1 / span 3",
                          },
                        }}
                      >
                        <Typography
                          fontWeight={600}
                          fontSize={13}
                        >
                          Reason
                        </Typography>

                        <Typography>
                          {leave.reason}
                        </Typography>
                      </Box>
                    </Box>

                    {/* INDIVIDUAL ACTIONS */}

                    {tab === 1 &&
                      leave.status === "pending" && (
                        <Box
                          mt={2}
                          display="flex"
                          gap={2}
                        >
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            disabled={processing}
                            onClick={() =>
                              handleApprove(leave.id)
                            }
                          >
                            Accept
                          </Button>

                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            disabled={processing}
                            onClick={() =>
                              handleRejectOpen(leave.id)
                            }
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* PAGINATION */}

      <Box
        display="flex"
        justifyContent="center"
        mt={3}
      >
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_event, value) =>
            setPage(value)
          }
        />
      </Box>

      {/* REJECT DIALOG */}

      <Dialog
        open={rejectDialog}
        onClose={() =>
          !processing && setRejectDialog(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Reject Leave
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            margin="dense"
            label="Enter Remark"
            value={remark}
            onChange={(event) =>
              setRemark(event.target.value)
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            disabled={processing}
            onClick={() =>
              setRejectDialog(false)
            }
          >
            Cancel
          </Button>

          <Button
            disabled={processing}
            color="error"
            onClick={handleRejectSubmit}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
