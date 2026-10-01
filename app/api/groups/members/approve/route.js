import { handleMembershipAction } from '../../../../../lib/group-membership-api';

export async function POST(req) {
  return handleMembershipAction(req, 'approve');
}