"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Trash2, Users, ChevronDown } from 'lucide-react';

interface ShareRecord {
  id: string;
  shared_with_email: string;
  can_edit: boolean;
  created_at: string;
}

interface SharedWithMeRecord {
  id: string;
  can_edit: boolean;
  auth_users: {
    username: string;
    email: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  isShared: boolean;
}

interface ShareManagementProps {
  fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

export const ShareManagement: React.FC<ShareManagementProps> = ({ fetchWithAuth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedByMe, setSharedByMe] = useState<ShareRecord[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMeRecord[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/shares');
      if (res.ok) {
        const data = await res.json();
        setSharedByMe(data.sharedByMe || []);
        setSharedWithMe(data.sharedWithMe || []);
      }
    } catch (e) {
      console.error('Failed to fetch shares', e);
    }
  }, [fetchWithAuth]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      fetchAvailableUsers();
    }
  }, [isOpen, fetchShares, fetchAvailableUsers]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, canEdit: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to share');
      } else {
        setEmail('');
        setShowUserList(false);
        fetchShares();
        fetchAvailableUsers();
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithUser = async (userEmail: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, canEdit: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to share');
      } else {
        setShowUserList(false);
        fetchShares();
        fetchAvailableUsers();
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/shares/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShares();
        fetchAvailableUsers();
      }
    } catch (e) {
      console.error('Failed to remove share', e);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Users size={18} />
        שיתוף
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 40,
                }}
              />
            </motion.div>
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{ pointerEvents: 'auto' }}
              >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">שיתוף גישה</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Add new share */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    שתף עם משתמש
                  </label>
                  
                  {/* User selection dropdown */}
                  <div className="relative mb-4">
                    <button
                      onClick={() => setShowUserList(!showUserList)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all flex items-center justify-between text-right"
                    >
                      <span className="text-slate-600">בחר משתמש מהרשימה</span>
                      <ChevronDown size={18} className={`transition-transform ${showUserList ? 'rotate-180' : ''}`} />
                    </button>

                    {showUserList && availableUsers.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-y-auto z-10">
                        {availableUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleShareWithUser(user.email)}
                            disabled={user.isShared || loading}
                            className={`w-full px-4 py-3 text-right hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                              user.isShared ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-800">{user.username}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                              {user.isShared && (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                  משותף
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {showUserList && availableUsers.length === 0 && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-4 text-center text-slate-500 z-10">
                        אין משתמשים נוספים זמינים
                      </div>
                    )}
                  </div>

                  {/* Manual email input as alternative */}
                  <form onSubmit={handleShare}>
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      או הזן אימייל ידנית
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <UserPlus size={18} />
                        שתף
                      </button>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-rose-600">{error}</p>
                    )}
                  </form>
                </div>

                {/* Users I shared with */}
                {sharedByMe.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">שיתפתי עם:</h3>
                    <div className="space-y-2">
                      {sharedByMe.map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                        >
                          <span className="text-slate-800 font-medium">{share.shared_with_email}</span>
                          <button
                            onClick={() => handleRemoveShare(share.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users who shared with me */}
                {sharedWithMe.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">משותף איתי:</h3>
                    <div className="space-y-2">
                      {sharedWithMe.map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-xl"
                        >
                          <div>
                            <p className="text-slate-800 font-medium">{share.auth_users.username}</p>
                            <p className="text-sm text-slate-500">{share.auth_users.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sharedByMe.length === 0 && sharedWithMe.length === 0 && (
                  <p className="text-center text-slate-500 py-8">אין שיתופים פעילים</p>
                )}
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
