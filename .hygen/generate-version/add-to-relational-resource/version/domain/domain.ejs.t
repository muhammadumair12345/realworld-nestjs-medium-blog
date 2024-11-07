---
to: src/<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>/<%= version%>/domain/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.<%= version%>.ts
---
import { ApiProperty } from '@nestjs/swagger';

export class <%= name %><%= version.toUpperCase() %> {
   @ApiProperty({
    type: String,
  })
  id: string;

  // @custom-inject-point
  @ApiProperty({
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
  })
  updatedAt: Date;

}
