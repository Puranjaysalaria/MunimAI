import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Item } from '../types/schema';
import { formatINR } from '../lib/utils';
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
import { triggerHaptic } from '../lib/sound';

interface StockProps {
  onOpenSupplierOrders: () => void;
  onQuickStockOrder: (item: Item) => void;
}

export const Stock: React.FC<StockProps> = ({ onOpenSupplierOrders, onQuickStockOrder }) => {
  const { items, transactions, user } = useShop();
  const { t, language } = useI18n();

  const [filter, setFilter] = useState<'all' | 'low'>('all');

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

  return (
    <div className="pb-32 px-4 pt-3 max-w-md mx-auto space-y-4 select-none">
      {/* Top Banner / Supplier Order Trigger */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-950 via-primary to-emerald-900 text-white rounded-3xl p-5 shadow-card flex items-center justify-between border border-emerald-800/40"
      >
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-200 font-black block">
            {t.stock.title}
          </span>
          <h2 className="text-2xl font-black mt-1 leading-tight tracking-tight">
            {lowStockAnalyses.length} सामान कम है
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1 font-medium">
            14 दिनों की खपत के आधार पर री-ऑर्डर तैयार
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic('start');
            onOpenSupplierOrders();
          }}
          className="touch-target-64 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md flex flex-col items-center justify-center space-y-1 border border-amber-300"
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span>सप्लायर लिस्ट</span>
        </motion.button>
      </motion.div>

      {/* Smart Seasonal Stocking Alert Card */}
      {activeSeason && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-3xl p-4 shadow-xs flex items-start space-x-3"
        >
          <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 flex-shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-amber-950">
                {language === 'pa'
                  ? activeSeason.seasonNamePa
                  : language === 'en'
                  ? activeSeason.seasonNameEn
                  : activeSeason.seasonName}
              </h4>
              <span className="text-[10px] bg-amber-200/80 font-black px-2 py-0.5 rounded-full text-amber-900 border border-amber-300/80">
                +{activeSeason.recommendedBoostPercentage}% मांग
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-1 leading-snug font-medium">
              {language === 'pa'
                ? activeSeason.descriptionPa
                : language === 'en'
                ? activeSeason.descriptionEn
                : activeSeason.description}
            </p>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setFilter('all')}
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
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
            filter === 'low'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {t.stock.filterLow} ({lowStockAnalyses.length})
          </span>
        </motion.button>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {displayedAnalyses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-gray-200">
            <PackageCheck className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
            <p className="font-bold text-sm text-slate-800">सब स्टॉक पूरा है</p>
            <p className="text-xs text-slate-400 mt-1">कोई भी सामान कम नहीं है</p>
          </div>
        ) : (
          displayedAnalyses.map((analysis) => {
            const item = analysis.item;
            const isLow = analysis.isLowStock;
            const isCritical = analysis.isCritical;
            const stockPct = Math.min(
              100,
              Math.round((item.current_stock / (item.min_threshold * 2.5 || 10)) * 100)
            );

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                className={`bg-white rounded-3xl p-4 shadow-card border transition-all space-y-3 ${
                  isCritical
                    ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                    : isLow
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-base text-slate-900 capitalize flex items-center space-x-2">
                      <span>{item.name}</span>
                      {isLow && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-owed flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          कम स्टॉक
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      बिक्री: <span className="font-black text-slate-800">{formatINR(item.selling_price)}</span> /{item.unit}
                      {isOwner ? (
                        <>
                          {' • '}लागत: {formatINR(item.cost_price)}
                          {' • '}
                          <span className="text-emerald-700 font-black inline-flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                            +₹{item.selling_price - item.cost_price} ({Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 ml-1">• लागत गुप्त</span>
                      )}
                    </p>
                  </div>

                  {/* Stock Number */}
                  <div className="text-right">
                    <div
                      className={`text-2xl font-black ${
                        isLow ? 'text-owed' : 'text-emerald-700'
                      }`}
                    >
                      {item.current_stock}
                      <span className="text-xs font-semibold ml-1 text-slate-400">
                        {item.unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      सीमा: {item.min_threshold} {item.unit}
                    </p>
                  </div>
                </div>

                {/* Stock Level Visual Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-rose-500'
                        : isLow
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(8, stockPct)}%` }}
                  />
                </div>

                {/* 14-Day Sales Run Rate & Days Left */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>रोज़ाना खपत: ~{analysis.dailyAvgSales} {item.unit}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-black px-2.5 py-1 rounded-xl text-[11px] ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : isLow
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {`${analysis.daysStockLeft} दिन बाकी`}
                    </span>

                    {isLow && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          triggerHaptic('start');
                          onQuickStockOrder(item);
                        }}
                        className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-black shadow-xs flex items-center space-x-1"
                      >
                        <ShoppingCart className="w-3 h-3 mr-0.5" />
                        <span>मंगवाएं</span>
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
