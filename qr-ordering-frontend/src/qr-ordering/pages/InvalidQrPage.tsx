import { StateMessage } from '../components/common/StateMessage';
import { PageShell } from '../components/layout/PageShell';
import { BrandHeader } from '../components/common/BrandHeader';

export function InvalidQrPage() {
  return (
    <PageShell>
      <BrandHeader title="QR Ordering" />
      <StateMessage
        title="Invalid QR link"
        message="Please scan the QR code on your table to open the menu. Direct links without a valid table token cannot be used."
      />
    </PageShell>
  );
}
