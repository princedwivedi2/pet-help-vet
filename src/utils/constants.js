export const APPOINTMENT_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export const SOS_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  acknowledged: { label: 'Acknowledged', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

export const VET_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'danger' },
  rejected: { label: 'Rejected', variant: 'danger' },
};
