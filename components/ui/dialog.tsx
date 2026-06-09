import * as Dialog from '@radix-ui/react-dialog';
import React from 'react';

const MiDialogo = () => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      <button>Abrir Diálogo</button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      <Dialog.Content style={{ padding: '20px', background: 'white', borderRadius: '8px' }}>
        <Dialog.Title>Título del Diálogo</Dialog.Title>
        <Dialog.Description>
          Esta es una descripción del contenido del diálogo.
        </Dialog.Description>
        <Dialog.Close asChild>
          <button>Cerrar</button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default MiDialogo;


