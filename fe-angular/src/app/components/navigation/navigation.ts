import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})
export class NavigationComponent {
  navItems = [
    { href: '/', label: 'Pedidos' },
    { href: '/customers', label: 'Clientes' },
    { href: '/products', label: 'Produtos' }
  ];
}
