import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import { toast } from '../ui/toast';
import {
  addMemberByEmail,
  getMemberRole,
  getOrgMembers,
  removeMember,
  updateMemberRole
} from '../../services/firebase/memberService';

const TeamManagement = ({ orgId, currentUserId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [currentRole, setCurrentRole] = useState(null);

  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([getOrgMembers(orgId), getMemberRole(orgId, currentUserId)])
      .then(([list, roleValue]) => {
        setMembers(list);
        setCurrentRole(roleValue);
      })
      .catch((error) => {
        console.error('Erro ao carregar equipe:', error);
        toast('Não foi possível carregar a equipe.', { type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [orgId, currentUserId]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === b.role) return (a.email || '').localeCompare(b.email || '');
      return a.role === 'admin' ? -1 : 1;
    });
  }, [members]);

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!email) {
      toast('Digite um e-mail válido.', { type: 'warning' });
      return;
    }
    try {
      await addMemberByEmail(orgId, email, role);
      toast('Membro adicionado com sucesso.', { type: 'success' });
      const list = await getOrgMembers(orgId);
      setMembers(list);
      setEmail('');
      setRole('member');
    } catch (error) {
      toast(error?.message || 'Erro ao adicionar membro.', { type: 'error' });
    }
  };

  const handleRoleChange = async (uid, nextRole) => {
    try {
      await updateMemberRole(orgId, uid, nextRole);
      setMembers((prev) => prev.map((m) => (m.id === uid ? { ...m, role: nextRole } : m)));
      toast('Permissão atualizada.', { type: 'success' });
    } catch (error) {
      toast('Não foi possível atualizar a permissão.', { type: 'error' });
    }
  };

  const handleRemove = async (uid) => {
    try {
      await removeMember(orgId, uid);
      setMembers((prev) => prev.filter((m) => m.id !== uid));
      toast('Membro removido.', { type: 'success' });
    } catch (error) {
      toast('Não foi possível remover o membro.', { type: 'error' });
    }
  };

  if (!orgId) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center text-zinc-400">
        Selecione uma organização para gerenciar a equipe.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={18} className="text-emerald-500" /> Gestão de Equipe
        </h3>
        <p className="text-zinc-500 text-sm mt-2">
          Convide membros e defina permissões. Apenas administradores podem editar.
        </p>
      </div>

      <form onSubmit={handleInvite} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@empresa.com"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
            disabled={!isAdmin}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:border-emerald-500 outline-none md:w-48"
            disabled={!isAdmin}
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={!isAdmin}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-3 rounded-xl flex items-center gap-2 disabled:bg-zinc-800"
          >
            <UserPlus size={16} /> Adicionar
          </button>
        </div>
        {!isAdmin && (
          <p className="text-xs text-zinc-500">
            Você não tem permissão para alterar a equipe.
          </p>
        )}
      </form>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">
          Membros ({sortedMembers.length})
        </h4>
        {loading ? (
          <div className="text-zinc-500 text-sm">Carregando...</div>
        ) : sortedMembers.length === 0 ? (
          <div className="text-zinc-500 text-sm">
            Nenhum membro encontrado. Convide alguém para colaborar.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{member.email || member.id}</p>
                  <p className="text-xs text-zinc-500">
                    {member.id === currentUserId ? 'Você' : 'Membro da equipe'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={member.role || 'member'}
                    onChange={(event) => handleRoleChange(member.id, event.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    disabled={!isAdmin || member.id === currentUserId}
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    disabled={!isAdmin || member.id === currentUserId}
                    className="text-rose-400 hover:text-rose-300 disabled:text-zinc-700"
                    title="Remover membro"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
