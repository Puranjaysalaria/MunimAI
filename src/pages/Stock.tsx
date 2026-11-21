import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Item, LastPriceChange } from '../types/schema';
import { formatINR } from '../lib/utils';
import { formatItemName, formatUnit } from '../lib/nameTranslation';
import { compute14DayStockAnalysis } from '../lib/stockAnalytics';
import { getSeasonalStockInsights } from '../lib/seasonalInsights';
import {
  AlertTriangle,
  ShoppingCart,
  Truck,
  TrendingDown,
  Sparkles,
  TrendingUp,
  PackageCheck,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../lib/sound';

interface StockProps {
  onOpenSupplierOrders: () => void;
  onQuickStockOrder: (item: Item) => void;
  highlightedItemId?: string | null;
  priceChangeInfo?: LastPriceChange | null;
  selectedItemId?: string | null;
  onSelectItem?: (item: Item) => void;
}

export const Stock: React.FC<StockProps> = ({
  onOpenSupplierOrders,
  onQuickStockOrder,
  highlightedItemId,
  priceChangeInfo,
  selectedItemId,
  onSelectItem,
}) => {
  const { items, transactions, user } = useShop();
  const { t, language } = useI18n();

  const [filter, setFilter] = useState<'all' | 'low'>('all');

  // Auto-scroll to highlighted item with reduced-motion support
  useEffect(() => {
    if (highlightedItemId) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const el = document.getElementById(`item-${highlightedItemId}`);
      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }
  }, [highlightedItemId]);

  // Seasonal smart recommendations
  const seasonalInsights = useMemo(() => getSeasonalStockInsights(), []);
  const activeSeason = seasonalInsights[0];

  // Dynamically compute 14-day velocity and days left from past transactions
  const stockAnalyses = useMemo(() => {
    return compute14DayStockAnalysis(items, transactions);
  }, [items, transactions]);

  const lowStockAnalyses = stockAnalyses.filter((a) => a.isLowStock);
  const displayedAnalyses = filter === 'low' ? lowStockAnalyses : stockAnalyses;
  const isOwner = user?.role !== 'staff';

  const handleOpenSuppliers = () => {
    triggerHaptic('start');
    playAudioCue('start');
    onOpenSupplierOrders();
  };

  const handleOrderClick = (item: Item) => {
    triggerHaptic('success');
    playAudioCue('success');
    onQuickStockOrder(item);
  };

  return (
    <div className="pb-32 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-6 pt-3 select-none">
      {/* Top Cards: Supplier Orders Banner & Seasonal Intelligence (2-cols on tablet/laptop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Supplier Order Trigger */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-950 via-primary to-emerald-900 text-white rounded-3xl p-6 shadow-card flex items-center justify-between border border-emerald-800/40 card-hover-elevate"
        >
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-200 font-black block">
              {t.stock.title}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-1 leading-tight tracking-tight">
              {lowStockAnalyses.length} {t.stock.itemsRunningLow}
            </h2>
            <p className="text-xs text-emerald-200/90 mt-1 font-medium">
              {t.stock.reorderReadySub}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleOpenSuppliers}
            className="touch-target-64 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-black text-xs rounded-2xl shadow-md flex flex-col items-center justify-center space-y-1 border border-amber-300 flex-shrink-0 ml-3"
          >
            <Truck className="w-5 h-5 mb-0.5" />
            <span>{t.stock.supplierListBtn}</span>
          </motion.button>
        </motion.div>

        {/* Smart Seasonal Stocking Alert Card */}
        {activeSeason && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-3xl p-5 shadow-xs flex items-start space-x-3.5 card-hover-elevate"
          >
            <div className="p-3 rounded-2xl bg-amber-400 text-slate-900 flex-shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-amber-950">
                  {language === 'pa'
                    ? activeSeason.seasonNamePa
                    : language === 'en'
                    ? activeSeason.seasonNameEn
                    : activeSeason.seasonName}
                </h4>
                <span className="text-[10px] bg-amber-200/80 font-black px-2.5 py-0.5 rounded-full text-amber-900 border border-amber-300/80">
                  +{activeSeason.recommendedBoostPercentage}% {t.stock.demandSurge}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed font-medium">
                {language === 'pa'
                  ? activeSeason.descriptionPa
                  : language === 'en'
                  ? activeSeason.descriptionEn
                  : activeSeason.description}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic('light');
            setFilter('all');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            filter === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {t.stock.filterAll} ({items.length})
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic('light');
            setFilter('low');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
            filter === 'low'
              ? 'bg-amber-500 text-slate-900 shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {t.stock.filterLow} ({lowStockAnalyses.length})
          </span>
        </motion.button>
      </div>

      {/* Responsive Items Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop/laptop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {displayedAnalyses.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center text-slate-400 border border-gray-200">
            <PackageCheck className="w-14 h-14 mx-auto text-emerald-500 mb-3" />
            <p className="font-bold text-base text-slate-800">{t.stock.allStockFull}</p>
            <p className="text-xs text-slate-400 mt-1">{t.stock.noItemsLow}</p>
          </div>
        ) : (
          displayedAnalyses.map((analysis, idx) => {
            const item = analysis.item;
            const isLow = analysis.isLowStock;
            const isCritical = analysis.isCritical;
            const stockPct = Math.min(
              100,
              Math.round((item.current_stock / (item.min_threshold * 2.5 || 10)) * 100)
            );

            const isHighlighted = highlightedItemId === item.id;
            const isSelected = selectedItemId === item.id;

            return (
              <motion.div
                key={item.id}
                id={`item-${item.id}`}
                onClick={() => {
                  triggerHaptic('light');
                  onSelectItem?.(item);
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isHighlighted ? 1.02 : 1,
                }}
                transition={{ delay: idx * 0.03, duration: 0.25 }}
                whileHover={{ y: -2 }}
                className={`bg-white rounded-2xl p-5 shadow-card border transition-all space-y-3.5 card-hover-elevate flex flex-col justify-between cursor-pointer ${
                  isHighlighted
                    ? 'border-amber-400 ring-4 ring-amber-400/80 bg-amber-50/50 shadow-2xl'
                    : isSelected
                    ? 'border-emerald-600 ring-4 ring-emerald-500/80 bg-emerald-50/40 shadow-xl'
                    : isCritical
                    ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                    : isLow
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-gray-100 hover:border-emerald-200'
                }`}
                title={language === 'pa' ? 'ਸਿਲੈਕਟ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ' : language === 'en' ? 'Tap to select item for voice actions' : 'वॉइस एक्शन के लिए टैप करें'}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900 capitalize flex flex-wrap items-center gap-1.5">
                        <span>{formatItemName(item.name, language)}</span>
                        {isHighlighted && priceChangeInfo && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 flex items-center shadow-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            ₹{priceChangeInfo.oldPrice} ➔ ₹{priceChangeInfo.newPrice}
                          </span>
                        )}
                        {isSelected && !isHighlighted && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center shadow-xs">
                            ✓ {language === 'pa' ? 'ਚੁਣਿਆ ਗਿਆ' : language === 'en' ? 'Selected' : 'चयनित'}
                          </span>
                        )}
                        {isLow && !isHighlighted && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-owed flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            {t.stock.stockLowBadge}
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        {t.stock.sellingPrice}: <span className="font-black text-slate-800">{formatINR(item.selling_price)}</span> /{formatUnit(item.unit, language)}
                        {isOwner ? (
                          <>
                            {' • '}{t.stock.costPrice}: {formatINR(item.cost_price)}
                            {' • '}
                            <span className="text-emerald-700 font-black inline-flex items-center">
                              <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                              +₹{item.selling_price - item.cost_price} ({Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 ml-1">• {t.stock.costHidden}</span>
                        )}
                      </p>
                    </div>

                    {/* Stock Number */}
                    <div className="text-right flex-shrink-0 ml-2">
                      <div
                        className={`text-2xl font-black ${
                          isLow ? 'text-owed' : 'text-emerald-700'
                        }`}
                      >
                        {item.current_stock}
                        <span className="text-xs font-semibold ml-1 text-slate-400">
                          {formatUnit(item.unit, language)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {t.stock.thresholdLimit}: {item.min_threshold} {formatUnit(item.unit, language)}
                      </p>
                    </div>
                  </div>

                  {/* Animated Stock Level Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden p-0.5 mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(8, stockPct)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${
                        isCritical
                          ? 'bg-rose-500'
                          : isLow
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* 14-Day Sales Run Rate & Days Left */}
                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="whitespace-nowrap">~{analysis.dailyAvgSales} {formatUnit(item.unit, language)}/{t.stock.perDay}</span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <span
                      className={`font-black px-2.5 py-1 rounded-xl text-[11px] ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : isLow
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {`${analysis.daysStockLeft} ${t.stock.daysLeftCount}`}
                    </span>

                    {isLow && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleOrderClick(item)}
                        className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-black shadow-xs flex items-center space-x-1"
                      >
                        <ShoppingCart className="w-3 h-3 mr-0.5" />
                        <span>{t.stock.orderBtn}</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
