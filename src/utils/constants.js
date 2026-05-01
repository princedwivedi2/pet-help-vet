export const APPOINTMENT_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  rejected: { label: 'Rejected', variant: 'danger' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  cancelled_by_user: { label: 'Cancelled by Owner', variant: 'danger' },
  cancelled_by_vet: { label: 'Cancelled by You', variant: 'danger' },
  no_show: { label: 'No Show', variant: 'default' },
};

export const APPOINTMENT_TYPES = {
  online: 'Online Consultation',
  clinic_visit: 'Clinic Visit',
  home_visit: 'Home Visit',
};

export const VET_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'danger' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  refunded: { label: 'Refunded', variant: 'info' },
  offline: { label: 'Cash', variant: 'default' },
};
