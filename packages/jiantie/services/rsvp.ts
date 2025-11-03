import { trpc } from '@/utils/trpc';

// RSVP Form Config APIs
export const upsertRsvpFormConfig = (params: {
  works_id: string;
  title: string;
  desc?: string;
  form_fields: any;
  allow_multiple_submit?: boolean;
  require_approval?: boolean;
  max_submit_count?: number | null;
  submit_deadline?: Date | null;
  enabled?: boolean;
}) => trpc.rsvp.upsertFormConfig.mutate(params);

export const updateRsvpFormConfig = (params: {
  id: string;
  title?: string;
  desc?: string;
  form_fields?: any;
  allow_multiple_submit?: boolean;
  require_approval?: boolean;
  max_submit_count?: number | null;
  submit_deadline?: Date | null;
  enabled?: boolean;
  deleted?: boolean;
}) => trpc.rsvp.updateFormConfig.mutate(params);

export const getRsvpFormConfigByWorksId = (works_id: string) =>
  trpc.rsvp.getFormConfigByWorksId.query({ works_id });

export const getRsvpFormConfigById = (id: string) =>
  trpc.rsvp.getFormConfigById.query({ id });

export const toggleRsvpFormEnabled = (id: string, enabled: boolean) =>
  trpc.rsvp.toggleFormEnabled.mutate({ id, enabled });

// Submissions
export const createRsvpSubmission = (params: {
  form_config_id: string;
  visitor_id?: string;
  contact_id?: string;
  submission_data: any;
  remark?: string;
}) => trpc.rsvp.createSubmission.mutate(params);

export const updateRsvpSubmissionVersion = (params: {
  submission_group_id: string;
  submission_data: any;
  changed_fields?: any;
  operator_type?: 'visitor' | 'admin' | 'system';
  operator_id?: string;
  operator_name?: string;
  remark?: string;
}) => trpc.rsvp.updateSubmissionVersion.mutate(params);

export const approveRsvpSubmission = (id: string, approved_by?: string) =>
  trpc.rsvp.approveOrRejectSubmission.mutate({
    id,
    approve: true,
    approved_by,
  });

export const rejectRsvpSubmission = (id: string, reject_reason?: string) =>
  trpc.rsvp.approveOrRejectSubmission.mutate({
    id,
    approve: false,
    reject_reason,
  });

export const cancelRsvpSubmission = (id: string, remark?: string) =>
  trpc.rsvp.cancelSubmission.mutate({ id, remark });

export const getRsvpLatestSubmissions = (params: {
  form_config_id: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  skip?: number;
  take?: number;
}) => trpc.rsvp.getLatestSubmissions.query(params);

export const getRsvpSubmissionHistory = (submission_group_id: string) =>
  trpc.rsvp.getSubmissionHistory.query({ submission_group_id });

// View logs
export const createRsvpViewLog = (params: {
  form_config_id: string;
  visitor_id?: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  device_type?: string;
  view_duration?: number;
}) => trpc.rsvp.createViewLog.mutate(params);

// Contacts
export const upsertRsvpContact = (params: {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
}) => trpc.rsvp.upsertContact.mutate(params);

export const findRsvpContacts = (params?: {
  keyword?: string;
  skip?: number;
  take?: number;
}) => trpc.rsvp.findContacts.query(params);
