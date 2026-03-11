import { Router, Request, Response } from 'express';
import { MenuService, RecipeService } from '../../src/services/menu.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/categories
router.get('/categories', async (_req: Request, res: Response) => {
    try {
        const categories = await MenuService.getAllCategories();
        res.json(categories);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/categories
router.post('/categories', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const category = await MenuService.createCategory(req.body.name);
        res.json(category);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/categories/:id
router.put('/categories/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const category = await MenuService.updateCategory(parseInt(req.params.id), req.body.name);
        res.json(category);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/categories/:id
router.delete('/categories/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await MenuService.softDeleteCategory(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/menu
router.get('/', async (req: Request, res: Response) => {
    try {
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const items = await MenuService.getAllMenuItems(categoryId);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/menu/active
router.get('/active', async (req: Request, res: Response) => {
    try {
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const items = await MenuService.getActiveMenuItems(categoryId);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/menu/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const item = await MenuService.getMenuItemById(parseInt(req.params.id));
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/menu
router.post('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const item = await MenuService.createMenuItem(req.body);
        res.json(item);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/menu/:id
router.put('/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const item = await MenuService.updateMenuItem(parseInt(req.params.id), req.body);
        res.json(item);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/menu/:id
router.delete('/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await MenuService.softDeleteMenuItem(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/menu/:id/toggle-active
router.post('/:id/toggle-active', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const item = await MenuService.toggleActive(parseInt(req.params.id));
        res.json(item);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/menu/:id/toggle-tracked
router.post('/:id/toggle-tracked', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const item = await MenuService.toggleTracked(parseInt(req.params.id));
        res.json(item);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/menu/:id/finish-batch
router.post('/:id/finish-batch', requireRole('EMPLOYER', 'CHEF'), async (req: Request, res: Response) => {
    try {
        const item = await MenuService.finishBatch(
            parseInt(req.params.id),
            req.body.quantity,
            req.dbUser!.id
        );
        res.json(item);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/menu/:id/recipe
router.get('/:id/recipe', async (req: Request, res: Response) => {
    try {
        const recipes = await RecipeService.getRecipe(parseInt(req.params.id));
        res.json(recipes);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/menu/:id/recipe
router.post('/:id/recipe', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const recipe = await RecipeService.addIngredient(
            parseInt(req.params.id),
            req.body.warehouseProductId,
            req.body.quantity
        );
        res.json(recipe);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/menu/:id/recipe/:productId
router.delete('/:id/recipe/:productId', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await RecipeService.removeIngredient(
            parseInt(req.params.id),
            parseInt(req.params.productId)
        );
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
