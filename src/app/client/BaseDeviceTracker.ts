import * as querystring from 'querystring';
import { ManagerClient } from './ManagerClient';
import { Message } from '../../common/Message';
import { ShellParams } from '../../common/ShellParams';
import { ScrcpyStreamParams } from '../../common/ScrcpyStreamParams';
import { QVHackStreamParams } from '../../common/QVHackStreamParams';
import { DevtoolsParams } from '../../common/DevtoolsParams';
import { BaseDeviceDescriptor } from '../../common/BaseDeviceDescriptor';

export type MapItem<T> = {
    field?: keyof T;
    title: string;
};

export abstract class BaseDeviceTracker<T extends BaseDeviceDescriptor, K> extends ManagerClient<K> {
    public static ACTION_LIST = 'devicelist';
    public static ACTION_DEVICE = 'device';
    protected tableId = 'droid_device_list';
    protected descriptors: T[] = [];

    protected constructor(action: string, protected rows: MapItem<T>[]) {
        super(action);
        this.setBodyClass('list');
        this.setTitle('Device list');
        this.openNewWebSocket();
    }

    protected abstract buildDeviceTable(): void;

    protected onSocketClose(e: CloseEvent): void {
        console.log(`Connection closed: ${e.reason}`);
        setTimeout(() => {
            this.openNewWebSocket();
        }, 2000);
    }

    protected onSocketMessage(e: MessageEvent): void {
        let message: Message;
        try {
            message = JSON.parse(e.data);
        } catch (error) {
            console.error(error.message);
            console.log(e.data);
            return;
        }
        switch (message.type) {
            case BaseDeviceTracker.ACTION_LIST:
                this.descriptors = message.data as T[];
                this.buildDeviceTable();
                break;
            case BaseDeviceTracker.ACTION_DEVICE:
                this.updateDescriptor(message.data as T);
                this.buildDeviceTable();
                break;
            default:
                console.log(`Unknown message type: ${message.type}`);
        }
    }

    protected getOrCreateTableHolder(): HTMLElement {
        let devices = document.getElementById('devices');
        if (!devices) {
            devices = document.createElement('div');
            devices.id = 'devices';
            devices.className = 'table-wrapper';
            document.body.appendChild(devices);
        }
        return devices;
    }

    protected updateDescriptor(descriptor: T): void {
        const idx = this.descriptors.findIndex((item: T) => {
            return item.udid === descriptor.udid;
        });
        if (idx !== -1) {
            this.descriptors[idx] = descriptor;
        } else {
            this.descriptors.push(descriptor);
        }
    }

    protected getOrBuildTableBody(parent: HTMLElement): Element {
        let tbody = document.querySelector(`#devices table#${this.tableId} tbody`) as Element;
        if (!tbody) {
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            this.rows.forEach((item) => {
                const { title } = item;
                const th = document.createElement('th');
                th.innerText = title;
                th.className = title.toLowerCase();
                headRow.appendChild(th);
            });
            thead.appendChild(headRow);
            table.appendChild(thead);
            tbody = document.createElement('tbody');
            table.id = this.tableId;
            table.appendChild(tbody);
            table.setAttribute('width', '100%');
            parent.appendChild(table);
        } else {
            while (tbody.children.length) {
                tbody.removeChild(tbody.children[0]);
            }
        }
        return tbody;
    }

    protected static buildLink(
        q: ScrcpyStreamParams | DevtoolsParams | ShellParams | QVHackStreamParams,
        text: string,
    ): HTMLAnchorElement {
        const hash = `#!${querystring.encode(q)}`;
        const a = document.createElement('a');
        a.setAttribute('href', `${location.origin}${location.pathname}${hash}`);
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('target', '_blank');
        a.innerText = text;
        return a;
    }
}
