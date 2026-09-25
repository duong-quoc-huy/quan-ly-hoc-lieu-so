import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { 
  Search, Plus, UserCheck, UserX, KeyRound, Loader2, Filter, ArrowUpDown 
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    gender: 'male',
    date_of_birth: '2000-01-01',
    phone_number_1: '',
    role: 'student',
  });

  // Password Reset Form State
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, activeFilter, ordering]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = { ordering };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.is_active = activeFilter;

      const data = await adminService.getUsers(params);
      setUsers(data.results || data);
    } catch (err) {
      setError('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        first_name: '',
        last_name: '',
        gender: 'male',
        date_of_birth: '2000-01-01',
        phone_number_1: '',
        role: 'student',
      });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Account creation failed.');
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    const reason = prompt(`Specify reason to ${action} account:`);
    if (reason === null) return;

    try {
      if (user.is_active) {
        await adminService.deactivateUser(user.user_id, reason);
      } else {
        await adminService.reactivateUser(user.user_id, reason);
      }
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} account.`);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      alert('Passwords do not match.');
      return;
    }

    try {
      await adminService.resetUserPassword(resetUser.user_id, {
        new_password: newPassword,
        new_password_2: newPasswordConfirm,
      });
      setResetUser(null);
      setNewPassword('');
      setNewPasswordConfirm('');
      alert('Password reset successfully.');
    } catch (err) {
      alert('Failed to reset password.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Account Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage user roles, security access, and profile statuses.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors self-start"
        >
          <Plus className="w-4 h-4" /> Create New Account
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, student ID or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>

          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="-created_at">Latest Created</option>
            <option value="created_at">Oldest Created</option>
            <option value="last_name">Last Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No accounts match your search filters.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">User Profile</th>
                <th className="px-4 py-3">Student ID / Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{u.student_id || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400">{u.phone_number_1 || 'No Phone'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize font-semibold text-slate-800">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setResetUser(u)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.is_active 
                              ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700' 
                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title={u.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                        >
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h2 className="text-base font-bold text-slate-900">Create New Account</h2>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newUser.phone_number_1}
                  onChange={(e) => setNewUser({ ...newUser, phone_number_1: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold rounded-xl">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h2 className="text-base font-bold text-slate-900">Reset Password for {resetUser.first_name}</h2>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setResetUser(null)} className="px-3 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}