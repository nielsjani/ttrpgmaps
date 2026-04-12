import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { PriceCalculatorService } from '../services/price-calculator.service';

@Component({
  selector: 'app-rarity-counter',
  templateUrl: './rarity-counter.component.html',
  styleUrls: ['./rarity-counter.component.scss']
})
export class RarityCounterComponent implements OnInit {
  @Input() rarity: string = '';
  @Input() label: string = '';
  @Input() defaultExpression: string = '1D6';
  @Output() configChange = new EventEmitter<{ rarity: string; count: number; enabled: boolean }>();

  count: number = 0;
  enabled: boolean = true;

  constructor(private priceCalc: PriceCalculatorService) {}

  ngOnInit(): void {
    this.count = this.priceCalc.rollDiceExpression(this.defaultExpression);
    this.emit();
  }

  increment(): void { this.count++; this.emit(); }

  decrement(): void {
    if (this.count > 0) this.count--;
    this.emit();
  }

  reroll(): void {
    this.count = this.priceCalc.rollDiceExpression(this.defaultExpression);
    this.emit();
  }

  toggleEnabled(): void { this.enabled = !this.enabled; this.emit(); }

  private emit(): void {
    this.configChange.emit({ rarity: this.rarity, count: this.count, enabled: this.enabled });
  }
}
