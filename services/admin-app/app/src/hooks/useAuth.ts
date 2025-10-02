import { useAuthContext } from '../contexts/AuthContext';

const useAuth = () => {
  return useAuthContext();
};

export default useAuth;
