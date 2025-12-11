import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import NodeCache from "node-cache";

export async function createProduct(req, res) {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const {
      name,
      sku,
      description,
      category,
      type,
      price,
      discountPrice,
      quantity,
    } = req.body;

    if (!name || name.trim().length < 3 || name.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid name: The product name is required and must be between 3 and 200 characters. Please provide a valid name.",
      });
    }

    if (!sku || !/^[a-zA-Z0-9-_]{3,50}$/.test(sku)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SKU: The SKU must be alphanumeric (letters, numbers), and can include hyphens or underscores. The length should be between 3 and 50 characters.",
      });
    }

    if (
      !category ||
      category.trim().length < 2 ||
      category.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category: Category name is required and should be between 2 and 100 characters. Please provide a valid category.",
      });
    }

    if (!["public", "private"].includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid type: The type must be either 'public' or 'private'. Please ensure you specify the correct type.",
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid price: Price is required and must be greater than 0. Please enter a valid price for the product.",
      });
    }

    if (
      discountPrice != null &&
      (discountPrice < 0 || discountPrice >= price)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid discount price: Discount price, if provided, must be greater than or equal to 0 and less than the regular price. Please check the discount value.",
      });
    }

    if (quantity == null || quantity < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid quantity: Quantity is required and must be a non-negative number. Please ensure you enter a valid quantity.",
      });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku,
        description: description ? description : null,
        category: category,
        type,
        price: price,
        discountPrice: discountPrice ? discountPrice : null,
        quantity,
      },
    });

    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product" });
  }
}

const myCache = new NodeCache({ stdTTL: 3600 });

export async function getProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      search,
      sort = "name",
      order = "asc",
      minPrice,
      maxPrice,
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (search)
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    if (minPrice) filters.price = { gte: Number(minPrice) };
    if (maxPrice) filters.price = { lte: Number(maxPrice) };
    const cacheKey = `products:${JSON.stringify(
      filters
    )}:page:${page}:limit:${limit}:sort:${sort}:order:${order}`;
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      console.log("Serv from cache");
      return res.status(200).json({ products: cachedData });
    }

    let products;
    if (req.user.role === "ADMIN") {
      products = await prisma.product.findMany({
        where: filters,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: Number(limit),
      });
    } else {
      products = await prisma.product.findMany({
        where: { ...filters, type: "public" },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: Number(limit),
      });
    }
    myCache.set(cacheKey, products);

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error retrieveng products" });
  }
}

export async function getSingleProduct(req, res) {
  try {
    const { role } = req.user;
    const { id } = req.params;
    if (role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized: Admins only" });
    }
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ product: product });
  } catch (error) {
    res.status(500).json({ message: "Error retrievng product" });
  }
}

export async function updateProduct(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Access token required" });

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (decoded.role !== "ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const { id } = req.params;
    const {
      name,
      description,
      category,
      type,
      price,
      discountPrice,
      quantity,
    } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name,
        description: description,
        category: category,
        type: type,
        price: price || product.price,
        discountPrice: discountPrice || product.discountPrice,
        quantity: quantity || product.quantity,
      },
    });

    res
      .status(200)
      .json({ message: "Product updated", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
}

export async function deleteProduct(req, res) {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.product.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: "Product deleted succesfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error delting product" });
  }
}

export async function getProductStatistics(req, res) {
  try {
    const totalProducts = await prisma.product.count();
    const totalInventoryValue = await prisma.product.aggregate({
      _sum: { price: true, quantity: true },
    });
    const totalDiscountedValue = await prisma.product.aggregate({
      _sum: { discountPrice: true, quantity: true },
    });
    const averagePrice = await prisma.product.aggregate({
      _avg: { price: true },
    });
    const outOfStockCount = await prisma.product.count({
      where: { quantity: 0 },
    });
    const productsByCategory = await prisma.product.groupBy({
      by: ["category"],
      _count: { id: true },
      _sum: { price: true, quantity: true },
    });
    const productsByType = await prisma.product.groupBy({
      by: ["type"],
      _count: { id: true },
      _sum: { price: true, quantity: true },
    });

    return res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        totalProducts,
        totalInventoryValue:
          totalInventoryValue._sum.price * totalInventoryValue._sum.quantity,
        totalDiscountedValue:
          totalDiscountedValue._sum.discountPrice *
          totalDiscountedValue._sum.quantity,
        averagePrice: averagePrice._avg.price,
        outOfStockCount,
        productsByCategory,
        productsByType,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving product statistics",
      error: error.message,
    });
  }
}
