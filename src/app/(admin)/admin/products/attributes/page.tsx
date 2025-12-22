import { getAttributes } from '@/lib/db';
import AttributesClient from './AttributesClient';

export const dynamic = 'force-dynamic';

export default async function AttributesPage() {
    const attributes = await getAttributes();
    return <AttributesClient initialAttributes={attributes} />;
}
