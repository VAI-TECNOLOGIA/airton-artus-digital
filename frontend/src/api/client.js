import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Bug 5: nenhuma request pode ficar pendente indefinidamente.
  // O axios aborta (ECONNABORTED) após o timeout — equivalente ao AbortController.
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mbd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('mbd_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Extrai mensagem de erro amigável de uma resposta da API. */
export function apiError(error, fallback = 'Ocorreu um erro.') {
  if (error?.code === 'ECONNABORTED') return 'Tempo de resposta esgotado. Verifique a conexão e tente novamente.';
  if (error?.message === 'Network Error') return 'Sem conexão com o servidor.';
  return (
    error?.response?.data?.error ||
    error?.response?.data?.issues?.[0]?.message ||
    error?.message ||
    fallback
  );
}

export default api;
