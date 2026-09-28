import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCategory, Product } from '../types';
import { SandikaleLogo } from '../components/SandikaleLogo';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Paintbrush,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Barcode,
  Tag
} from 'lucide-react';

interface POSViewProps {
  onOpenCustomModal: () => void;
  onOpenCheckoutModal: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  onOpenCustomModal,
  onOpenCheckoutModal
}) => {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTotalItems,
    t,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (F2: Search focus, F4: Checkout, F8: Custom Sablon)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        onOpenCheckoutModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        onOpenCustomModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, onOpenCheckoutModal, onOpenCustomModal]);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: t.allCategories },
    { id: 'Bahan Polos', label: 'Bahan Kaos' },
    { id: 'Jasa Sablon', label: 'Jasa Sablon DTF' },
    { id: 'Ready Stock', label: 'Ready Stock' },
    { id: 'Merchandise', label: 'Merchandise' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950">
      
      {/* Left Panel: Catalog & Filters (Flex 1) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-800/80">
        
        {/* Top Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex gap-2">
            {/* Search Input with Barcode support */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-500 transition"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-mono font-bold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded">
                F2
              </span>
            </div>

            {/* Custom Sablon Order Button */}
            <button
              onClick={onOpenCustomModal}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-red-950/40 shrink-0"
              title="Shortcut: F8"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="hidden sm:inline">{t.customSablonBtn}</span>
              <span className="sm:hidden">+ Sablon</span>
              <span className="hidden md:inline text-[10px] bg-red-800/80 px-1 rounded font-mono">F8</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
              <Tag className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
              <p className="text-xs text-slate-600 mt-1">Coba kata kunci lain atau gunakan tombol Custom Sablon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0 && !product.isRawMaterial;
                const isLowStock = product.stock <= product.minStock && product.stock > 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCart(product);
                      }
                    }}
                    className={`group relative bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-slate-800'
                        : 'cursor-pointer hover:border-red-500/50 hover:shadow-xl hover:shadow-red-950/20 border-slate-800/90 active:scale-[0.98]'
                    }`}
                  >
                    {/* Image Thumbnail */}
                    <div className="relative aspect-square w-full bg-slate-800 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to placeholder if image fails
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80';
                        }}
                      />
                      {/* Category Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[9px] font-mono font-semibold text-slate-300 uppercase">
                        {product.category}
                      </span>

                      {/* Stock Warning Badge */}
                      {isLowStock && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-slate-950 text-[9px] font-bold">
                          Sisa {product.stock}
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">
                          Habis
                        </span>
                      )}
                    </div>

                    {/* Content & Price */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">
                          {product.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          SKU: {product.sku}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold text-white font-mono">
                          Rp {product.price.toLocaleString('id-ID')}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Transaction Cart & Checkout Drawer (w-96) */}
      <div className="w-full lg:w-96 bg-slate-900 flex flex-col shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/90 relative">
        
        {/* Subtle Sandikale Watermark in Cart corner to reinforce identity */}
        <div className="absolute right-2 bottom-20 pointer-events-none z-0">
          <SandikaleLogo variant="watermark" />
        </div>

        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 relative z-10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-sm text-white">{t.cartTitle}</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
              {cartTotalItems} {t.itemsCount}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-400 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t.clearCart}</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
          {cart.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500 mb-3">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.emptyCart}
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-200 leading-tight">
                      {item.name}
                    </h5>
                    {item.customDetails?.sideSpecs && item.customDetails.sideSpecs.length > 0 && (
                      <div className="text-[10px] text-red-400/90 font-mono mt-0.5">
                        {item.customDetails.sideSpecs.join(' • ')}
                      </div>
                    )}
                    {item.customDetails?.customerNotes && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                        {item.customDetails.customerNotes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-500 hover:text-red-400 transition p-1"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-xs font-bold text-white font-mono">
                    Rp {(item.price * item.qty).toLocaleString('id-ID')}
                  </span>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white font-mono">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 relative z-10 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>{t.subtotal}</span>
              <span className="text-slate-200 font-mono">
                Rp {cartSubtotal.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base text-white pt-2 border-t border-slate-800/80">
              <span>{t.totalTagihan}</span>
              <span className="text-lg font-black text-red-500 font-mono">
                Rp {cartSubtotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenCheckoutModal}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm transition shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{t.payButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
