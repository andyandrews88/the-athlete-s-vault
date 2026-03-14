import { useParams } from 'react-router-dom';

const AdminClientProfile = () => {
  const { userId } = useParams();

  return (
    <div className="min-h-screen bg-vault-bg p-8">
      <h1 className="font-display text-4xl tracking-wide mb-4 text-primary">CLIENT PROFILE</h1>
      <p className="text-vault-dim text-sm font-mono">User ID: {userId}</p>
      <p className="text-vault-dim text-sm font-mono mt-2">Coming soon</p>
    </div>
  );
};

export default AdminClientProfile;
