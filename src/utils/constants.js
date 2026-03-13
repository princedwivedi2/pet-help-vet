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

export const SOS_STATUS = {
  pending: { label: 'Pending', variant: 'warning' },
  sos_pending: { label: 'Pending', variant: 'warning' },
  acknowledged: { label: 'Acknowledged', variant: 'info' },
  sos_accepted: { label: 'Accepted', variant: 'info' },
  vet_on_the_way: { label: 'On the Way', variant: 'primary' },
  arrived: { label: 'Arrived', variant: 'primary' },
  in_progress: { label: 'In Progress', variant: 'danger' },
  sos_in_progress: { label: 'Treating', variant: 'danger' },
  treatment_in_progress: { label: 'Treating', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  sos_completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
  sos_cancelled: { label: 'Cancelled', variant: 'default' },
  expired: { label: 'Expired', variant: 'default' },
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
