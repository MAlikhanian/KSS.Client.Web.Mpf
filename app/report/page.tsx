'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CustomerStatementContent } from './content';

export default function MpfCustomerStatementPage() {
  return (
    <Fragment>
      <Container>
        <CustomerStatementContent />
      </Container>
    </Fragment>
  );
}
