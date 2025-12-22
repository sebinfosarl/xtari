
import { getSalesPeople } from '@/lib/db';
import SalesTeamView from './SalesTeamView';

export default async function SalesTeamPage() {
    const salesPeople = await getSalesPeople();
    return <SalesTeamView initialSalesPeople={salesPeople} />;
}
