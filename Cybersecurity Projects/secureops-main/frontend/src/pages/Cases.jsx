import { Plus, Table2, Columns3 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import CaseBoard from '../components/cases/CaseBoard';
import CaseForm from '../components/cases/CaseForm';
import CaseList from '../components/cases/CaseList';
import Loading from '../components/common/Loading';
import Pagination from '../components/common/Pagination';
import { useCaseBoard, useCases } from '../hooks/useCases';
import { caseService } from '../services/caseService';

export default function Cases() {
  const [view, setView] = useState('board');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const list = useCases({ page, page_size: 25 });
  const board = useCaseBoard();
  const create = useMutation({
    mutationFn: caseService.create,
    onSuccess: () => {
      toast.success('Case created');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case-board'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Cases</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Incident workflow, SLA tracking, and linked alert investigation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'board' ? 'primary' : 'secondary'} icon={Columns3} onClick={() => setView('board')}>Board</Button>
          <Button variant={view === 'list' ? 'primary' : 'secondary'} icon={Table2} onClick={() => setView('list')}>List</Button>
          <Button icon={Plus} onClick={() => setOpen(true)}>New case</Button>
        </div>
      </div>
      {view === 'board' ? board.isLoading ? <Loading label="Loading board" /> : <CaseBoard board={board.data || {}} /> : list.isLoading ? <Loading label="Loading cases" /> : <CaseList cases={list.data?.items || []} />}
      {view === 'list' ? <Pagination page={page} pageSize={25} total={list.data?.total || 0} onPageChange={setPage} /> : null}
      <Modal open={open} title="Create Case" onClose={() => setOpen(false)}>
        <CaseForm onSubmit={(payload) => create.mutate(payload)} isLoading={create.isPending} />
      </Modal>
    </div>
  );
}
