import React, { useState } from 'react';
import OptimizedDiffViewer from '../../components/OptimizedDiffViewer';

const OptimizedDiffPage: React.FC = () => {
  const [oldText] = useState(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}

function formatPrice(price) {
  return '$' + price.toFixed(2);
}

// Config
const config = {
  currency: 'USD',
  locale: 'en-US'
};`);

  const [newText] = useState(`function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// Config
const config = {
  currency: 'EUR',
  locale: 'de-DE'
};`);

  return (
    <div className="h-full p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Optimized Diff Viewer</h1>
        <p className="text-gray-600">
          改进版差异对比组件。支持智能识别“修改”行，并在行内高亮显示具体的字符变化（Unified View 增强版）。
          <br />
          <span className="text-sm text-gray-500 mt-1 inline-block">
            * 注意观察下方 `config` 对象中的值变化，以及函数重构的差异显示。
          </span>
        </p>
      </div>

      <div className="flex-1 shadow-lg rounded-lg bg-white overflow-hidden">
        <OptimizedDiffViewer
          oldText={oldText}
          newText={newText}
          fileName="utils.js"
        />
      </div>
    </div>
  );
};

export default OptimizedDiffPage;
