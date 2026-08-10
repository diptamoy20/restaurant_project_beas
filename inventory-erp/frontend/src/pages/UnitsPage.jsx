import React from 'react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';

export function UnitsPage() {
  const units = [
    { code: 'KG', name: 'Kilogram', type: 'Weight' },
    { code: 'GM', name: 'Gram', type: 'Weight' },
    { code: 'L', name: 'Liter', type: 'Volume' },
    { code: 'ML', name: 'Milliliter', type: 'Volume' },
    { code: 'Piece', name: 'Piece / Count', type: 'Discrete' },
    { code: 'Packet', name: 'Packet / Bag', type: 'Packaging' },
    { code: 'Bottle', name: 'Bottle', type: 'Packaging' },
    { code: 'Box', name: 'Box / Carton', type: 'Packaging' },
  ];

  const columns = [
    { header: 'Unit Code', key: 'code' },
    { header: 'Unit Name', key: 'name' },
    { header: 'Measurement Type', key: 'type' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Units of Measure (UOM)</h1>
        <p className="text-sm text-slate-500">View standard measurement units configured in the ERP.</p>
      </div>

      <Card title="Supported Measurement Units" eyebrow="Master Config">
        <Table columns={columns} data={units} />
      </Card>
    </div>
  );
}
