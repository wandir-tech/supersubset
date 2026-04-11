import dynamic from 'next/dynamic';

const EcommerceHost = dynamic(
  () => import('../components/EcommerceHost').then((module) => module.EcommerceHost),
  { ssr: false },
);

export default function HomePage() {
  return <EcommerceHost />;
}