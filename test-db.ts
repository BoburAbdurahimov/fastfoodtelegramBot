import prisma from './src/config/prisma';

async function test() {
    try {
        console.log('Connecting to Prisma...');
        const count = await prisma.user.count();
        console.log('User count:', count);
        console.log('Success!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
