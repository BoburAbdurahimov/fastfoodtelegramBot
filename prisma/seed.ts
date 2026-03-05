import { PrismaClient } from '@prisma/client';
const Role = { EMPLOYER: 'EMPLOYER', EMPLOYEE: 'EMPLOYEE' };
const Unit = { PCS: 'PCS', KG: 'KG', GRAM: 'GRAM', LITER: 'LITER', ML: 'ML' };

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create employer
    const employer = await prisma.user.upsert({
        where: { telegramId: BigInt(process.env.EMPLOYER_TELEGRAM_ID || '123456789') },
        update: {},
        create: {
            telegramId: BigInt(process.env.EMPLOYER_TELEGRAM_ID || '123456789'),
            name: 'Owner',
            role: Role.EMPLOYER,
            salary: 0,
        },
    });
    console.log(`  ✅ Employer: ${employer.name}`);

    // Create warehouse products
    const products = await Promise.all([
        prisma.warehouseProduct.create({ data: { name: 'Bun', unit: Unit.PCS, costPerUnit: 0.30, quantity: 100, lowStockThreshold: 20 } }),
        prisma.warehouseProduct.create({ data: { name: 'Sausage', unit: Unit.PCS, costPerUnit: 0.50, quantity: 80, lowStockThreshold: 15 } }),
        prisma.warehouseProduct.create({ data: { name: 'Beef Patty', unit: Unit.PCS, costPerUnit: 1.20, quantity: 60, lowStockThreshold: 10 } }),
        prisma.warehouseProduct.create({ data: { name: 'Cheese Slice', unit: Unit.PCS, costPerUnit: 0.25, quantity: 100, lowStockThreshold: 20 } }),
        prisma.warehouseProduct.create({ data: { name: 'Tomato', unit: Unit.KG, costPerUnit: 2.00, quantity: 10, lowStockThreshold: 3 } }),
        prisma.warehouseProduct.create({ data: { name: 'Lettuce', unit: Unit.KG, costPerUnit: 1.50, quantity: 8, lowStockThreshold: 2 } }),
        prisma.warehouseProduct.create({ data: { name: 'Ketchup', unit: Unit.ML, costPerUnit: 0.005, quantity: 5000, lowStockThreshold: 500 } }),
        prisma.warehouseProduct.create({ data: { name: 'Mustard', unit: Unit.ML, costPerUnit: 0.006, quantity: 3000, lowStockThreshold: 500 } }),
        prisma.warehouseProduct.create({ data: { name: 'Coca Cola', unit: Unit.PCS, costPerUnit: 0.80, quantity: 50, lowStockThreshold: 10 } }),
        prisma.warehouseProduct.create({ data: { name: 'French Fries', unit: Unit.KG, costPerUnit: 1.50, quantity: 20, lowStockThreshold: 5 } }),
    ]);
    console.log(`  ✅ ${products.length} warehouse products created`);

    // Create categories
    const hotDogsCat = await prisma.menuCategory.create({ data: { name: 'Hot Dogs' } });
    const burgersCat = await prisma.menuCategory.create({ data: { name: 'Burgers' } });
    const drinksCat = await prisma.menuCategory.create({ data: { name: 'Drinks' } });
    const sidesCat = await prisma.menuCategory.create({ data: { name: 'Sides' } });
    console.log('  ✅ 4 categories created');

    // Create menu items with recipes
    const hotdog = await prisma.menuItem.create({ data: { name: 'Classic Hotdog', price: 3.99, categoryId: hotDogsCat.id } });
    await prisma.recipe.createMany({
        data: [
            { menuItemId: hotdog.id, warehouseProductId: products[0].id, quantity: 1 },   // Bun
            { menuItemId: hotdog.id, warehouseProductId: products[1].id, quantity: 1 },   // Sausage
            { menuItemId: hotdog.id, warehouseProductId: products[6].id, quantity: 10 },  // Ketchup 10ml
            { menuItemId: hotdog.id, warehouseProductId: products[7].id, quantity: 5 },   // Mustard 5ml
        ],
    });

    const burger = await prisma.menuItem.create({ data: { name: 'Classic Burger', price: 5.99, categoryId: burgersCat.id } });
    await prisma.recipe.createMany({
        data: [
            { menuItemId: burger.id, warehouseProductId: products[0].id, quantity: 1 },    // Bun
            { menuItemId: burger.id, warehouseProductId: products[2].id, quantity: 1 },    // Beef Patty
            { menuItemId: burger.id, warehouseProductId: products[3].id, quantity: 1 },    // Cheese
            { menuItemId: burger.id, warehouseProductId: products[4].id, quantity: 0.05 }, // Tomato 50g
            { menuItemId: burger.id, warehouseProductId: products[5].id, quantity: 0.03 }, // Lettuce 30g
            { menuItemId: burger.id, warehouseProductId: products[6].id, quantity: 15 },   // Ketchup 15ml
        ],
    });

    const doubleBurger = await prisma.menuItem.create({ data: { name: 'Double Burger', price: 8.99, categoryId: burgersCat.id } });
    await prisma.recipe.createMany({
        data: [
            { menuItemId: doubleBurger.id, warehouseProductId: products[0].id, quantity: 1 },
            { menuItemId: doubleBurger.id, warehouseProductId: products[2].id, quantity: 2 },
            { menuItemId: doubleBurger.id, warehouseProductId: products[3].id, quantity: 2 },
            { menuItemId: doubleBurger.id, warehouseProductId: products[4].id, quantity: 0.08 },
            { menuItemId: doubleBurger.id, warehouseProductId: products[5].id, quantity: 0.05 },
            { menuItemId: doubleBurger.id, warehouseProductId: products[6].id, quantity: 20 },
        ],
    });

    const cola = await prisma.menuItem.create({ data: { name: 'Coca Cola', price: 1.99, categoryId: drinksCat.id } });
    await prisma.recipe.createMany({
        data: [
            { menuItemId: cola.id, warehouseProductId: products[8].id, quantity: 1 },
        ],
    });

    const fries = await prisma.menuItem.create({ data: { name: 'French Fries', price: 2.49, categoryId: sidesCat.id } });
    await prisma.recipe.createMany({
        data: [
            { menuItemId: fries.id, warehouseProductId: products[9].id, quantity: 0.15 },
            { menuItemId: fries.id, warehouseProductId: products[6].id, quantity: 10 },
        ],
    });

    console.log('  ✅ 5 menu items with recipes created');
    console.log('\n✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
