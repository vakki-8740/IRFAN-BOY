import React, { useState } from 'react';
import { Toolbar, TicketList } from '../components/shared.jsx';

export default function TicketListPage({ tickets, view }) {
    const [search, setSearch] = useState('');
    const q = search.toLowerCase().trim();

    let list = tickets;
    if (view === 'pending') list = list.filter((t) => t.status === 'pending');
    if (view === 'resolved') list = list.filter((t) => t.status === 'resolved');
    if (q) {
        list = list.filter((t) =>
            (t.name + ' ' + t.mobile + ' ' + t.email + ' ' + t.problem + ' ' + t.type +
                ' ' + (t.game_pass || '') + ' ' + (t.issue || '') + ' ' + (t.amount || ''))
                .toLowerCase().includes(q)
        );
    }

    const emptyMsg = q
        ? 'No tickets found for this search.'
        : 'Tickets will appear here once submitted from the user side.';

    return (
        <>
            <Toolbar search={search} onSearch={setSearch} />
            <TicketList list={list} emptyMsg={emptyMsg} />
        </>
    );
}
