// Next.js 15 dynamic route params are received as Promises.
export type IdPageProps = {
  params: Promise<{ id: string }>;
};
