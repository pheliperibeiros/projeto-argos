import { buscarPorId } from './src/lib/db/investigados';

async function test() {
    try {
        // We will just pick the first investigado ID or pass a fake uuid and see if it fails on relation or ID.
        await buscarPorId('00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
        console.error("ERROR CAUGHT:");
        console.error(err.message);
    }
}
test();
