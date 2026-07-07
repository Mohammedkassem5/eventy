import { QueryClient } from "@tanstack/react-query";

// إعداد عميل React Query — كاش وإعادة المحاولة لكل طلبات السيرفر
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // الداتا تعتبر طازجة 5 دقائق
      retry: 1, // محاولة واحدة إضافية عند الفشل
      refetchOnWindowFocus: false, // ما يعيدش الجلب عند الرجوع للتاب
    },
  },
});
