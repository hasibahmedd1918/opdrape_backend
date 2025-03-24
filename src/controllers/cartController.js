const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

const cartController = {
    // Add item to cart
    async addToCart(req, res) {
        try {
            const userId = req.user._id;
            const { productId, colorVariant, size } = req.body;

            if (!productId || !colorVariant || !size) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Find product
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // Find matching color variant
            const matchingColorVariant = product.colorVariants.find(cv => 
                cv.color.name === colorVariant.color.name &&
                cv.color.hexCode === colorVariant.color.hexCode
            );

            if (!matchingColorVariant) {
                return res.status(400).json({
                    error: `Color "${colorVariant.color.name}" not found for product ${product.name}`
                });
            }

            // Find matching size in the color variant
            const matchingSize = matchingColorVariant.sizes.find(s => s.name === size.name);
            if (!matchingSize) {
                return res.status(400).json({
                    error: `Size "${size.name}" not found for color "${colorVariant.color.name}" for product ${product.name}`
                });
            }

            // Check if size has enough stock
            if (matchingSize.stock < size.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for size "${size.name}" of color "${colorVariant.color.name}" for product ${product.name}`
                });
            }

            // Determine product price
            const productPrice = product.salePrice || product.basePrice || product.price;
            if (isNaN(productPrice) || productPrice < 0) {
                return res.status(400).json({ error: `Product ${product.name} has no valid price` });
            }

            // Find or create cart for user
            let cart = await Cart.findOne({ user: userId });

            if (!cart) {
                cart = new Cart({
                    user: userId,
                    items: []
                });
            }

            // Check if item already exists in cart with same color and size
            const existingItemIndex = cart.items.findIndex(item => 
                item.product.toString() === productId &&
                item.colorVariant.color.name === colorVariant.color.name &&
                item.size.name === size.name
            );

            if (existingItemIndex > -1) {
                // Update quantity if item exists
                cart.items[existingItemIndex].size.quantity += size.quantity;
            } else {
                // Add new item
                cart.items.push({
                    product: productId,
                    colorVariant: {
                        color: matchingColorVariant.color,
                        images: matchingColorVariant.images
                    },
                    size: {
                        name: size.name,
                        quantity: size.quantity
                    },
                    price: productPrice
                });
            }

            // Calculate total amount safely
            cart.totalAmount = cart.items.reduce((total, item) => {
                if (!item || !item.price || !item.size || !item.size.quantity) {
                    console.error('Invalid item in cart:', item);
                    return total;
                }
                return total + (item.price * item.size.quantity);
            }, 0);

            // Save the cart
            await cart.save();

            // SYNC WITH USER MODEL CART: Also update the user's cart array
            const user = await User.findById(userId);
            if (user) {
                // See if the product is already in the user's cart
                const userCartItemIndex = user.cart.findIndex(item => 
                    item.product.toString() === productId
                );
                
                if (userCartItemIndex > -1) {
                    // Update quantity
                    user.cart[userCartItemIndex].quantity += size.quantity;
                } else {
                    // Add new item
                    user.cart.push({ 
                        product: productId, 
                        quantity: size.quantity 
                    });
                }
                
                await user.save();
            }

            // Return populated cart
            const populatedCart = await Cart.findById(cart._id)
                .populate({
                    path: 'items.product',
                    select: 'name _id category'
                });

            res.json(populatedCart);
        } catch (error) {
            console.error('Cart Error:', error);
            res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Get cart
    async getCart(req, res) {
        try {
            const userId = req.user._id;
            
            // Get cart from Cart model
            const cart = await Cart.findOne({ user: userId })
                .populate({
                    path: 'items.product',
                    select: 'name _id category'
                });

            // If no cart exists in Cart model but exists in User model, create one
            if (!cart) {
                const user = await User.findById(userId).populate('cart.product');
                
                // If user has items in their cart array, create a Cart document
                if (user && user.cart && user.cart.length > 0) {
                    const newCart = new Cart({
                        user: userId,
                        items: []
                    });
                    
                    // Add each item from user cart to the Cart model
                    for (const item of user.cart) {
                        if (!item.product) continue;
                        
                        const product = await Product.findById(item.product);
                        if (!product || !product.colorVariants || product.colorVariants.length === 0) continue;
                        
                        // Use first color variant and size as defaults
                        const defaultColorVariant = product.colorVariants[0];
                        const defaultSize = defaultColorVariant.sizes[0];
                        
                        newCart.items.push({
                            product: item.product,
                            colorVariant: {
                                color: defaultColorVariant.color,
                                images: defaultColorVariant.images
                            },
                            size: {
                                name: defaultSize.name,
                                quantity: item.quantity
                            },
                            price: product.salePrice || product.basePrice || product.price
                        });
                    }
                    
                    await newCart.save();
                    return res.json(newCart);
                }
                
                return res.json({ items: [], totalAmount: 0 });
            }

            res.json(cart);
        } catch (error) {
            res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Update cart item quantity
    async updateCartItem(req, res) {
        try {
            const { productId, colorVariant, size } = req.body;

            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart) {
                return res.status(404).json({ error: 'Cart not found' });
            }

            // Find the item in cart
            const itemIndex = cart.items.findIndex(item => 
                item.product.toString() === productId &&
                item.colorVariant.color.name === colorVariant.color.name &&
                item.size.name === size.name
            );

            if (itemIndex === -1) {
                return res.status(404).json({ error: 'Item not found in cart' });
            }

            // Update quantity
            cart.items[itemIndex].size.quantity = size.quantity;

            // Recalculate total amount
            cart.totalAmount = cart.items.reduce((total, item) => 
                total + (item.price * item.size.quantity), 0
            );

            await cart.save();

            const updatedCart = await Cart.findById(cart._id)
                .populate({
                    path: 'items.product',
                    select: 'name _id category'
                });

            res.json(updatedCart);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Remove item from cart
    async removeFromCart(req, res) {
        try {
            const userId = req.user._id;
            const { productId, colorVariant, size } = req.body;

            // 1. Remove from standalone Cart model
            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ error: 'Cart not found' });
            }

            // Remove the item
            cart.items = cart.items.filter(item => 
                !(item.product.toString() === productId &&
                item.colorVariant.color.name === colorVariant.color.name &&
                item.size.name === size.name)
            );

            // Recalculate total amount
            cart.totalAmount = cart.items.reduce((total, item) => 
                total + (item.price * item.size.quantity), 0
            );

            await cart.save();

            // 2. Also remove from User model cart array
            const user = await User.findById(userId);
            if (user) {
                // Since User model doesn't track color/size, remove by productId
                user.cart = user.cart.filter(item => 
                    item.product.toString() !== productId
                );
                await user.save();
            }

            const updatedCart = await Cart.findById(cart._id)
                .populate({
                    path: 'items.product',
                    select: 'name _id category'
                });

            res.json(updatedCart);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Clear cart
    async clearCart(req, res) {
        try {
            const userId = req.user._id;
            
            // 1. Clear standalone Cart model
            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ error: 'Cart not found' });
            }

            cart.items = [];
            cart.totalAmount = 0;
            cart.totalItems = 0;
            await cart.save();

            // 2. Also clear User model cart array
            const user = await User.findById(userId);
            if (user) {
                user.cart = [];
                await user.save();
            }

            res.json({ message: 'Cart cleared successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = cartController; 