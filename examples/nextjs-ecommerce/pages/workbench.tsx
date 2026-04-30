import dynamic from 'next/dynamic';

const WorkbenchHost = dynamic(
  () => import('../components/WorkbenchHost').then((module) => module.WorkbenchHost),
  { ssr: false },
);

export default function WorkbenchPage() {
  return <WorkbenchHost />;
}
