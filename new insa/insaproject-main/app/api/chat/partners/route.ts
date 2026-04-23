// API route to get allowed chat partners based on role and task assignment
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Task, { ITask } from '../../../../models/Task';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const currentUser = await User.findOne({ email: session.user.email });
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  type PartnerUser = {
    _id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    lastActive?: Date;
  };
  let partners: PartnerUser[] = [];
  if (currentUser.role === 'Director') {
    // Get all Division Heads
    const divisionHeads = await User.find({ role: 'Division Head' });
    // Get staff assigned to Director's tasks
    const directorTasks: ITask[] = await Task.find({ assignedBy: currentUser._id });
    const staffIds = directorTasks.map((t: ITask) => t.assignedTo);
    const staff = await User.find({ _id: { $in: staffIds } });
    partners = [...divisionHeads, ...staff].map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      lastActive: u.lastActive,
    }));
  } else if (currentUser.role === 'Division Head') {
    // Get Director(s)
    const directors = await User.find({ role: 'Director' });
    // Get staff assigned to Division Head's tasks
    const divisionTasks: ITask[] = await Task.find({ assignedBy: currentUser._id });
    const staffIds = divisionTasks.map((t: ITask) => t.assignedTo);
    const staff = await User.find({ _id: { $in: staffIds } });
    partners = [...directors, ...staff].map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      lastActive: u.lastActive,
    }));
  } else if (currentUser.role === 'Staff') {
    // Get tasks assigned to this staff
    const tasks: ITask[] = await Task.find({ assignedTo: currentUser._id });
    // Get unique assigners (Director or Division Head)
    const assignerIds = [...new Set(tasks.map((t: ITask) => t.assignedBy.toString()))];
    const assigners = await User.find({ _id: { $in: assignerIds } });
    partners = assigners.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      lastActive: u.lastActive,
    }));
  }

  // Only return minimal user info
  const result = partners.map((u: PartnerUser) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image,
    lastActive: u.lastActive,
  }));
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}
