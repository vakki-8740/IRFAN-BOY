import React from 'react';
import { TicketList } from '../components/shared.jsx';

export default function Dashboard({ tickets }) {
    const recent = tickets.slice(0, 8);
    return (
        <>
            <div className="ticket-list-head">
                <h2>Recent Tickets</h2>
                <a href="#/tickets">View All</a>
            </div>
            <TicketList
                list={recent}
                emptyMsg="No tickets yet. They will appear here once users submit."
            />
        </>
    );
}
