import { DrawingStore } from '../state/DrawingStore';

export class UserList {
  private store: DrawingStore;
  private listEl: HTMLElement;
  private countBadgeEl: HTMLElement;

  constructor(store: DrawingStore) {
    this.store = store;
    this.listEl = document.getElementById('user-list') as HTMLElement;
    this.countBadgeEl = document.getElementById('user-count-badge') as HTMLElement;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const users = this.store.getUsers();
    const myUser = this.store.getMyUser();

    this.countBadgeEl.textContent = users.length.toString();
    this.listEl.innerHTML = '';

    users.forEach((user) => {
      const li = document.createElement('li');
      li.className = 'user-item';

      const dot = document.createElement('span');
      dot.className = 'user-color-dot';
      dot.style.backgroundColor = user.color;

      const name = document.createElement('span');
      name.className = 'user-name';
      const isMe = myUser && user.id === myUser.id;
      name.textContent = isMe ? `${user.name} (You)` : user.name;

      li.appendChild(dot);
      li.appendChild(name);
      this.listEl.appendChild(li);
    });
  }
}
