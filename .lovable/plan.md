Vou corrigir a aba Comentários para impedir que textos longos expandam a página.

Plano:
1. Ajustar o layout pai em `TicketDetail.tsx` para permitir que a área principal encolha corretamente (`min-w-0`) dentro do flex, evitando que a aba force largura infinita.
2. Reforçar o container da aba `comments` com limite de largura e `overflow-x-hidden`, mantendo o scroll apenas vertical.
3. Ajustar `TicketComments.tsx` para que o componente inteiro tenha `w-full min-w-0 max-w-full overflow-x-hidden` e para que cada card/linha quebre strings longas sem aumentar a largura.
4. Ajustar `CommentAttachmentList.tsx` para nomes de anexos muito longos também respeitarem o limite do card.

Não vou alterar regras de negócio, envio de comentários, anexos, notificações ou banco de dados; será apenas correção visual/responsiva.