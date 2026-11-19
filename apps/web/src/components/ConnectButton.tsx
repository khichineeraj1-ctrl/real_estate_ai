'use client';

import { useRef, useState } from 'react';
import { EnquiryForm } from './EnquiryForm';

interface Props {
  /** What the buyer is asking about: a builder's project, or one home. */
  kind: 'project' | 'property';
  slug: string;
  name: string;
  /**
   * 'agent': the project has agents we have verified, and the buyer is connected to one of them.
   * 'seller': a home posted by an owner or agent, whose contact is shown. 'callback': our team or the builder calls back.
   */
  mode: 'agent' | 'seller' | 'callback';
  /** For a register project whose builder has not joined us. */
  unclaimed?: boolean;
  /** How many verified agents sell the project, for the button's wording. */
  agents?: number;
  /** On a detail page: a large button that opens the whole form (plans, budget, message), not the short one. */
  full?: boolean;
  /** Sizes the buyer can say they are interested in, for the whole form. */
  interests?: string[];
}

const LABEL = { agent: 'Connect with a verified agent', seller: 'Contact seller', callback: 'Request a call back' };

/** The button on a card. It opens a short form over the page, so a buyer can ask without leaving the list they are reading. */
export function ConnectButton({ kind, slug, name, mode, unclaimed, agents, full, interests }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false); // the form is only put on the page once asked for
  return (
    <>
      <button type="button" className={`connect ${mode === 'agent' ? 'is-verified' : ''} ${full ? 'is-big' : ''}`} onClick={() => { setOpen(true); requestAnimationFrame(() => dialog.current?.showModal()); }}>
        {mode === 'agent' && <span aria-hidden="true" className="tick">✓</span>}{full && mode !== 'agent' && <span aria-hidden="true" className="tick">{mode === 'seller' ? '🤝' : '📞'}</span>}{LABEL[mode]}
      </button>
      {open && (
        <dialog ref={dialog} className={`connect-dialog ${full ? 'is-wide' : ''}`} aria-label={`${LABEL[mode]}: ${name}`} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <div className="connect-body">
            <button type="button" className="connect-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
            <header className="connect-head">
              <span className="connect-icon" aria-hidden="true">{mode === 'agent' ? '🛡️' : mode === 'seller' ? '🤝' : '📞'}</span>
              <div><h2>{mode === 'agent' ? 'Connect with a verified agent' : mode === 'seller' ? 'Contact the seller' : 'Request a call back'}</h2><p>{name}</p></div>
            </header>
            <p className="connect-about">
              {mode === 'agent' ? `${agents && agents > 1 ? `${agents} agents we have verified sell this project.` : 'An agent we have verified sells this project.'} Leave your details and you will be shown one agent’s name and number; they will call you too.`
                : mode === 'seller' ? 'Leave your details and you will be shown the seller’s name and phone number.'
                  : unclaimed ? 'Leave your details and our team will call you. The builder has not joined us yet, so we will find out prices and availability for you.' : 'Leave your details and you will get a call back.'}
            </p>
            <EnquiryForm slug={slug} kind={kind} reveal={mode === 'seller'} projectName={name} unclaimed={unclaimed} via={mode === 'agent' ? 'agent' : undefined} compact={!full} interests={interests} />
          </div>
        </dialog>
      )}
    </>
  );
}
