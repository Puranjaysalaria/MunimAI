import React, { useState, useMemo } from 'react';
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
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Top Banner / Supplier Order Trigger */}
      <div className="bg-primary text-white rounded-2xl p-4 shadow-card flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
            {t.stock.title}
          </span>
          <h2 className="text-xl font-black mt-0.5">
            {lowStockAnalyses.length} सामान कम है
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            14 दिनों की बिक्री के आधार पर री-ऑर्डर तैयार
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('start');
            onOpenSupplierOrders();
          }}
          className="touch-target-64 px-3.5 py-2 bg-accent hover:bg-accent-hover text-app-text font-black text-xs rounded-xl shadow-md active:scale-95 flex flex-col items-center justify-center"
        >
          <Truck className="w-5 h-5 mb-1" />
          <span>सप्लायर लिस्ट</span>
        </button>
      </div>

      {/* Smart Seasonal Stocking Alert Card */}
      {activeSeason && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shadow-xs flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-accent text-zinc-950 flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-amber-900">
                {language === 'pa'
                  ? activeSeason.seasonNamePa
                  : language === 'en'
                  ? activeSeason.seasonNameEn
                  : activeSeason.seasonName}
              </h4>
              <span className="text-[10px] bg-amber-200/60 font-bold px-2 py-0.5 rounded-full text-amber-900">
                +{activeSeason.recommendedBoostPercentage}% मांग
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-1 leading-snug">
              {language === 'pa'
                ? activeSeason.descriptionPa
                : language === 'en'
                ? activeSeason.descriptionEn
                : activeSeason.description}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            filter === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-surface text-app-muted border border-gray-200'
          }`}
        >
          {t.stock.filterAll} ({items.length})
        </button>

        <button
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center space-x-1 ${
            filter === 'low'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-surface text-amber-700 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          <span>{t.stock.filterLow} ({lowStockAnalyses.length})</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {displayedAnalyses.map((analysis) => {
          const item = analysis.item;
          const isLow = analysis.isLowStock;
          const isCritical = analysis.isCritical;

          return (
            <div
              key={item.id}
              className={`bg-surface rounded-2xl p-4 shadow-card border transition-all ${
                isCritical
                  ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20'
                  : isLow
                  ? 'border-amber-200'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-app-text capitalize flex items-center">
                    <span>{item.name}</span>
                    {isLow && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        कम स्टॉक
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-app-muted mt-0.5 leading-relaxed">
                    भाव: <span className="font-bold text-app-text">{formatINR(item.selling_price)}</span> /{item.unit}
                    {isOwner ? (
                      <>
                        {' • '}लागत: {formatINR(item.cost_price)}
                        {' • '}
                        <span className="text-emerald-700 font-bold inline-flex items-center">
                          <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                          +₹{item.selling_price - item.cost_price} ({Math.round(((item.selling_price - item.cost_price) / item.selling_price) * 100)}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400 ml-1">• लागत गुप्त</span>
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
                    <span className="text-xs font-medium ml-1 text-app-muted">
                      {item.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    न्यूनतम: {item.min_threshold} {item.unit}
                  </p>
                </div>
              </div>

              {/* 14-Day Sales Run Rate & Days Left */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-app-muted">
                  <span className="flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    रोज़ाना बिक्री: ~{analysis.dailyAvgSales} {item.unit}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      isCritical
                        ? 'bg-red-100 text-red-800 animate-pulse'
                        : isLow
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {`${analysis.daysStockLeft} दिन बाकी`}
                  </span>

                  {isLow && (
                    <button
                      onClick={() => onQuickStockOrder(item)}
                      className="px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark active:scale-95 flex items-center space-x-1"
                    >
                      <ShoppingCart className="w-3 h-3 mr-0.5" />
                      <span>मंगवाएं</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
